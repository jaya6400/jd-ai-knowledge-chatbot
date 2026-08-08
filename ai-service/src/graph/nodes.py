import json
import os
import chromadb
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.vectorstores import Chroma
from tenacity import retry, wait_exponential, stop_after_attempt
from .state import GraphState
from ..services.custom_embeddings import GeminiEmbeddings
from ..config import settings

_llm = None
_embeddings = None
_vector_store = None

def _get_api_key():
    return settings.gemini_api_key

def get_llm():
    global _llm
    if _llm is None:
        key = _get_api_key()
        if not key:
            raise ValueError("GEMINI_API_KEY is not set.")
        _llm = ChatGoogleGenerativeAI(
            model="gemini-3.5-flash",
            temperature=0.2,
            google_api_key=key,
            transport="rest",  # avoid eager grpc.aio channel construction, which needs
                                # a running uvloop-compatible loop unavailable in worker threads
        )
    return _llm

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = GeminiEmbeddings()
    return _embeddings

def get_vector_store():
    global _vector_store
    if _vector_store is None:
        client = chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port
        )
        _vector_store = Chroma(
            client=client,
            collection_name="documents",
            embedding_function=get_embeddings(),
        )
    return _vector_store

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=15),
    stop=stop_after_attempt(3),
    reraise=True,
)
def _similarity_search_with_retry(store, query: str, k: int = 5):
    return store.similarity_search(query, k=k)

def retrieve_node(state: GraphState) -> GraphState:
    try:
        store = get_vector_store()
        docs = _similarity_search_with_retry(store, state["question"], k=5)
        return {**state, "context": docs}
    except Exception as e:
        print(f"Retrieve error after retries: {e}", flush=True)
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

    chain = prompt | get_llm()
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

    chain = prompt | get_llm()
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