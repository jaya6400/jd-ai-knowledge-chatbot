import os

class Settings:
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    chroma_host: str = os.getenv("CHROMA_HOST", "localhost")
    
    # Securely evaluate the string port with a clean fallback 
    chroma_port: int = int(os.getenv("CHROMA_PORT", "8000").strip())
    
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    database_url: str = os.getenv("DATABASE_URL", "")
    uploads_dir: str = "/app/uploads"

settings = Settings()
