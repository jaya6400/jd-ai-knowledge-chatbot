import os
from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from ..config import settings

def extract_text_from_pdf(file_path: str) -> tuple:
    full_path = os.path.join(settings.uploads_dir, file_path)
    reader = PdfReader(full_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            pages.append({"page": i + 1, "text": text})
    return pages, len(reader.pages)

def chunk_documents(pages: list, source_name: str) -> list:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    documents = []
    for page in pages:
        chunks = text_splitter.split_text(page["text"])
        for chunk in chunks:
            documents.append(Document(
                page_content=chunk,
                metadata={"source": source_name, "page": page["page"]}
            ))
    return documents
