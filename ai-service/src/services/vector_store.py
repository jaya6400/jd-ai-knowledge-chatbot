import chromadb
from langchain_community.vectorstores import Chroma
from tenacity import retry, wait_exponential, stop_after_attempt
from ..services.custom_embeddings import GeminiEmbeddings
from ..config import settings

_embeddings = None
_chroma_client = None
_langchain_store = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = GeminiEmbeddings()
    return _embeddings

def get_raw_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port
        )
    return _chroma_client

def get_chroma_store():
    global _langchain_store
    if _langchain_store is None:
        _langchain_store = Chroma(
            client=get_raw_chroma_client(),
            collection_name="documents",
            embedding_function=get_embeddings(),
        )
    return _langchain_store

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(4),
    reraise=True,
)
def _add_batch(store, batch: list):
    store.add_documents(batch)

def add_documents(docs: list, batch_size: int = 8) -> int:
    store = get_chroma_store()
    failed = 0
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]
        try:
            _add_batch(store, batch)
        except Exception as e:
            print(f"[vector_store] Batch {i}-{i+len(batch)} failed after retries: {e}", flush=True)
            failed += len(batch)
    if failed:
        print(f"[vector_store] {failed}/{len(docs)} chunks failed to embed", flush=True)
    return len(docs) - failed

def delete_by_source(source_name: str):
    client = get_raw_chroma_client()
    try:
        collection = client.get_collection("documents")
        collection.delete(where={"source": source_name})
    except Exception as e:
        print(f"[vector_store] Delete warning for '{source_name}': {e}", flush=True)