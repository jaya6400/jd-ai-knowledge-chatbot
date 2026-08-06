from typing import TypedDict, List, Optional
from langchain_core.documents import Document

class GraphState(TypedDict):
    question: str
    chat_history: List[dict]
    context: List[Document]
    answer: str
    sources: List[dict]
    suggested_questions: List[str]
    error: Optional[str]
