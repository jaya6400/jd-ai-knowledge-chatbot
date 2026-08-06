import google.generativeai as genai
from langchain_core.embeddings import Embeddings
from ..config import settings


class GeminiEmbeddings(Embeddings):
    """Thin wrapper around the raw google-generativeai SDK's embed_content call.

    Bypasses langchain-google-genai's GoogleGenerativeAIEmbeddings, which hangs
    reliably (~60s then 504) with gemini-embedding-001 on this SDK version,
    even though the raw SDK call itself succeeds in under a second.
    """

    def __init__(self, model: str = "models/gemini-embedding-001"):
        key = settings.gemini_api_key
        if not key:
            raise ValueError("GEMINI_API_KEY environment variable is missing.")
        genai.configure(api_key=key)
        self.model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        result = genai.embed_content(model=self.model, content=texts)
        return result["embedding"]

    def embed_query(self, text: str) -> list[float]:
        result = genai.embed_content(model=self.model, content=text)
        return result["embedding"]