from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import documents, query, health
from config import get_settings

settings = get_settings()

app = FastAPI(
    title="Bitcoder RAG Engine",
    description="Document processing, vectorization, and RAG pipeline for Bitcoder AI Orchestrator",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(query.router, prefix="/api/query", tags=["Query"])


@app.on_event("startup")
async def startup_event():
    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
