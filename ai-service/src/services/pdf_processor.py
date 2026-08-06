import os
import sys
from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from ..config import settings

def extract_text_from_pdf(file_path: str) -> tuple:
    # Force alignment with docker-compose volume (/app/uploads)
    # If settings.uploads_dir is relative, it breaks inside Docker.
    uploads_dir = getattr(settings, 'uploads_dir', '/app/uploads')
    
    # Handle both raw filenames and pre-joined paths cleanly
    if os.path.isabs(file_path):
        full_path = file_path
    else:
        full_path = os.path.join(uploads_dir, file_path)
    
    print(f"DEBUG: Attempting to read PDF from expected path: {full_path}", file=sys.stderr)
    
    if not os.path.exists(full_path):
        print(f"ERROR: File does not exist at {full_path}. Available files: {os.listdir(uploads_dir) if os.path.exists(uploads_dir) else 'None'}", file=sys.stderr)
        raise FileNotFoundError(f"Shared file not found at path: {full_path}")
        
    try:
        reader = PdfReader(full_path)
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                pages.append({"page": i + 1, "text": text})
        return pages, len(reader.pages)
    except Exception as e:
        print(f"ERROR: Failed reading PDF metadata/pages: {str(e)}", file=sys.stderr)
        raise e

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

