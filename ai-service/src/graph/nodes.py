import json
from typing import List
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.vectorstores import Chroma
from .state import GraphState
from ..config import settings

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash",
    temperature=0.2,
    google_api_key=settings.google_api_key,
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=settings.google_api_key,
)

vector_store = None

def get_vector_store():
    global vector_store
    if vector_store is None:
        vector_store = Chroma(
            collection_name="documents",
            embedding_function=embeddings,
            client_settings={
                "chroma_server_host": settings.chroma_host,
                "chroma_server_http_port": settings.chroma_port,
            },
        )
    return vector_store

def retrieve_node(state: GraphState) -> GraphState:
    try:
        store = get_vector_store()
        docs = store.similarity_search(state["question"], k=5)
        return {**state, "context": docs}
    except Exception as e:
        return {**state, "context": [], "error": str(e)}

def generate_answer_node(state: GraphState) -> GraphState:
    context_text = "\n\n".join([
        f"[Source: {doc.metadata.get('source', 'Unknown')}, Page: {doc.metadata.get('page', 'N/A')}]\n{doc.page_content}"
        for doc in state["context"]
    ])

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful AI assistant. Answer the user's question based ONLY on the provided context. If the context doesn't contain the answer, say you don't know. Cite sources when possible."),
        ("human", "Context:\n{context}\n\nChat History:\n{history}\n\nQuestion: {question}\n\nAnswer:")
    ])

    history = state.get("chat_history", [])
    history_str = "\n".join([
        f"{'User' if m.get('role') == 'user' else 'AI'}: {m.get('content', '')}"
        for m in history[-6:]
    ])

    chain = prompt | llm
    response = chain.invoke({
        "context": context_text,
        "history": history_str,
        "question": state["question"]
    })

    sources = []
    for doc in state["context"]:
        sources.append({
            "document_name": doc.metadata.get("source", "Unknown"),
            "page_number": doc.metadata.get("page", None),
        })

    return {**state, "answer": response.content, "sources": sources}

def generate_suggestions_node(state: GraphState) -> GraphState:
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Based on the conversation, generate 3-5 relevant follow-up questions the user might ask. Return ONLY a JSON array of strings."),
        ("human", "Question: {question}\nAnswer: {answer}\n\nGenerate follow-up questions as JSON array:")
    ])

    chain = prompt | llm
    response = chain.invoke({
        "question": state["question"],
        "answer": state["answer"]
    })

    try:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        suggestions = json.loads(content)
        if not isinstance(suggestions, list):
            suggestions = []
    except Exception:
        suggestions = [
            "Can you explain this in more detail?",
            "What are the related topics?",
            "How does this apply in practice?"
        ]

    return {**state, "suggested_questions": suggestions[:5]}
