from fastapi import APIRouter
from services.vector_store import VectorStore

router = APIRouter()


@router.get("")
async def health_check():
    return {"status": "ok", "service": "bitcoder-rag-engine", "version": "1.0.0"}


@router.get("/ready")
async def readiness_check():
    try:
        vector_store = VectorStore()
        client = vector_store.client
        client.heartbeat()
        return {"status": "ready", "chromadb": "connected"}
    except Exception as e:
        return {"status": "not_ready", "chromadb": f"error: {str(e)}"}
