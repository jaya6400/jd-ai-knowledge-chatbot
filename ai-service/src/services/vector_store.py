from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from ..config import settings

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=settings.google_api_key,
)

def get_chroma_client():
    return Chroma(
        collection_name="documents",
        embedding_function=embeddings,
        client_settings={
            "chroma_server_host": settings.chroma_host,
            "chroma_server_http_port": settings.chroma_port,
        },
    )

def add_documents(docs: list):
    store = get_chroma_client()
    store.add_documents(docs)
    return len(docs)

def delete_by_source(source_name: str):
    store = get_chroma_client()
    try:
        store.delete(where={"source": source_name})
    except Exception as e:
        print(f"Delete warning: {e}")
