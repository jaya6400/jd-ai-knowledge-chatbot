import json
import asyncio
import redis.asyncio as redis
from ..config import settings
from ..graph.workflow import app as graph_app
from ..services.pdf_processor import extract_text_from_pdf, chunk_documents
from ..services.vector_store import add_documents, delete_by_source

class RedisService:
    def __init__(self):
        self.client = redis.from_url(settings.redis_url)

    async def start_listener(self):
        pubsub = self.client.pubsub()
        await pubsub.subscribe("ai_requests")
        print("AI Service: Listening on ai_requests channel")
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    await self.handle_request(data)
                except Exception as e:
                    print(f"Error handling request: {e}")

    async def handle_request(self, data: dict):
        request_id = data.get("request_id")
        req_type = data.get("type")

        if req_type == "chat":
            await self.handle_chat(request_id, data)
        elif req_type == "process_pdf":
            await self.handle_process_pdf(request_id, data)

    async def handle_chat(self, request_id: str, data: dict):
        try:
            result = graph_app.invoke({
                "question": data["question"],
                "chat_history": data.get("chat_history", []),
                "context": [],
                "answer": "",
                "sources": [],
                "suggested_questions": [],
                "error": None,
            })

            response = {
                "request_id": request_id,
                "answer": result["answer"],
                "sources": result["sources"],
                "suggested_questions": result["suggested_questions"],
                "success": True,
            }
        except Exception as e:
            response = {
                "request_id": request_id,
                "answer": "Sorry, I encountered an error.",
                "sources": [],
                "suggested_questions": [],
                "success": False,
                "error": str(e),
            }

        await self.client.publish("ai_responses", json.dumps(response))

    async def handle_process_pdf(self, request_id: str, data: dict):
        try:
            file_path = data["file_path"]
            source_name = file_path

            delete_by_source(source_name)

            pages, page_count = extract_text_from_pdf(file_path)
            docs = chunk_documents(pages, source_name)
            add_documents(docs)

            response = {
                "request_id": request_id,
                "success": True,
                "page_count": page_count,
                "chunks": len(docs),
            }
        except Exception as e:
            response = {
                "request_id": request_id,
                "success": False,
                "error": str(e),
            }

        await self.client.publish("ai_responses", json.dumps(response))
