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
        try:
            print("AI Service: Connecting to Redis...", flush=True)
            await self.client.ping()
            print("AI Service: Redis ping succeeded", flush=True)
            pubsub = self.client.pubsub()
            await pubsub.subscribe("ai_requests")
            print("AI Service: Listening on ai_requests channel", flush=True)
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        asyncio.create_task(self._handle_request_safe(data))
                    except Exception as e:
                        print(f"Error unpacking message: {e}", flush=True)
        except Exception as e:
            print(f"AI Service Redis listener failed: {e}", flush=True)
            raise

    async def _handle_request_safe(self, data: dict):
        try:
            await self.handle_request(data)
        except Exception as e:
            print(f"Error handling request {data.get('request_id')}: {e}", flush=True)
            request_id = data.get("request_id")
            if request_id:
                await self.client.publish("ai_responses", json.dumps({
                    "request_id": request_id,
                    "success": False,
                    "error": str(e),
                }))

    async def handle_request(self, data: dict):
        request_id = data.get("request_id")
        req_type = data.get("type")

        if req_type == "chat":
            result = await self._handle_chat(request_id, data)
        elif req_type == "process_pdf":
            result = await self._handle_process_pdf(request_id, data)
        else:
            result = {"request_id": request_id, "success": False, "error": f"Unknown type: {req_type}"}

        if request_id:
            await self.client.publish("ai_responses", json.dumps(result))

    async def _handle_chat(self, request_id: str, data: dict):
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(graph_app.invoke, {
                    "question": data["question"],
                    "chat_history": data.get("chat_history", []),
                    "context": [],
                    "answer": "",
                    "sources": [],
                    "suggested_questions": [],
                    "error": None,
                }),
                timeout=60,  # chat should be fast; if it hangs past this, something's wrong
            )
            return {
                "request_id": request_id,
                "answer": result["answer"],
                "sources": result["sources"],
                "suggested_questions": result["suggested_questions"],
                "success": True,
            }
        except asyncio.TimeoutError:
            print(f"Chat handling timed out for request {request_id}", flush=True)
            return {
                "request_id": request_id,
                "answer": "Sorry, that took too long to process. Please try again.",
                "sources": [],
                "suggested_questions": [],
                "success": False,
                "error": "Chat processing timed out",
            }
        except Exception as e:
            return {
                "request_id": request_id,
                "answer": "Sorry, I encountered an error.",
                "sources": [],
                "suggested_questions": [],
                "success": False,
                "error": str(e),
            }

    async def _handle_process_pdf(self, request_id: str, data: dict):
        try:
            file_path = data["file_path"]
            source_name = file_path

            print(f"[process_pdf] Starting delete_by_source for {source_name}", flush=True)
            await asyncio.wait_for(asyncio.to_thread(delete_by_source, source_name), timeout=30)

            print(f"[process_pdf] Starting extract_text_from_pdf for {source_name}", flush=True)
            pages, page_count = await asyncio.wait_for(
                asyncio.to_thread(extract_text_from_pdf, file_path), timeout=30
            )

            print(f"[process_pdf] Starting chunk_documents ({page_count} pages)", flush=True)
            docs = await asyncio.wait_for(
                asyncio.to_thread(chunk_documents, pages, source_name), timeout=30
            )

            print(f"[process_pdf] Starting add_documents ({len(docs)} chunks)", flush=True)
            await asyncio.wait_for(asyncio.to_thread(add_documents, docs), timeout=120)

            print(f"[process_pdf] Completed for {source_name}", flush=True)
            return {
                "request_id": request_id,
                "success": True,
                "page_count": page_count,
                "chunks": len(docs),
            }
        except asyncio.TimeoutError as e:
            print(f"[process_pdf] Step timed out for {data.get('file_path')}: {e}", flush=True)
            return {
                "request_id": request_id,
                "success": False,
                "error": "PDF processing step timed out — likely a Chroma connection issue",
            }
        except Exception as e:
            print(f"PDF processing error: {e}", flush=True)
            return {
                "request_id": request_id,
                "success": False,
                "error": str(e),
            }