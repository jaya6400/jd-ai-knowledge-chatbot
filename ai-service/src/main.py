import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .services.redis_service import RedisService

redis_service = RedisService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(redis_service.start_listener())
    yield
    task.cancel()

app = FastAPI(title="AI Service", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}

@app.get("/")
async def root():
    return {"message": "AI Service is running", "docs": "/docs"}