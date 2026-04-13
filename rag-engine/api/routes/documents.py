import os
import shutil
import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks

logger = logging.getLogger(__name__)
from api.schemas import (
    UploadResponse,
    DocumentStatus,
    ProcessingStatus,
    DeleteRequest,
    ReindexRequest,
)
from services.document_processor import DocumentProcessor
from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore
from config import get_settings

router = APIRouter()
settings = get_settings()

processing_status_store: dict[str, ProcessingStatus] = {}


def _update_status(
    document_id: str,
    status: DocumentStatus,
    phase: str,
    progress: int,
    chunks_count: int,
    message: str,
):
    processing_status_store[document_id] = ProcessingStatus(
        document_id=document_id,
        status=status,
        phase=phase,
        progress=progress,
        chunks_count=chunks_count,
        message=message,
    )


async def process_document_background(
    file_path: str,
    document_id: str,
    document_name: str,
    context_id: str,
    organization_id: str,
):
    try:
        processor = DocumentProcessor()
        embedding_service = EmbeddingService()
        vector_store = VectorStore()
        _update_status(
            document_id, DocumentStatus.PROCESSING, "Extracting text", 20, 0,
            "Membaca dan mengekstrak teks dari dokumen..."
        )
        await asyncio.sleep(0.1)

        chunks = processor.process_document(file_path)
        if not chunks:
            _update_status(
                document_id, DocumentStatus.ERROR, "Failed", 0, 0,
                "Dokumen tidak mengandung teks yang dapat diproses."
            )
            return

        _update_status(
            document_id, DocumentStatus.VECTORIZING, "Generating embeddings", 50, len(chunks),
            f"Menghasilkan {len(chunks)} vektor embeddings..."
        )
        await asyncio.sleep(0.1)

        texts = [chunk["content"] for chunk in chunks]
        embeddings = embedding_service.embed_texts(texts)

        _update_status(
            document_id, DocumentStatus.INDEXING, "Storing vectors", 80, len(chunks),
            f"Menyimpan {len(chunks)} vektor ke database..."
        )
        await asyncio.sleep(0.1)

        vector_store.add_documents(
            organization_id=organization_id,
            context_id=context_id,
            document_id=document_id,
            document_name=document_name,
            chunks=chunks,
            embeddings=embeddings,
        )

        logger.info(f"[{document_id}] Successfully processed {len(chunks)} chunks")
        _update_status(
            document_id, DocumentStatus.READY, "Complete", 100, len(chunks),
            f"Dokumen berhasil diproses. {len(chunks)} chunks tersimpan."
        )

    except Exception as e:
        logger.error(f"[{document_id}] Processing failed: {str(e)}", exc_info=True)
        _update_status(
            document_id, DocumentStatus.ERROR, "Error", 0, 0, f"Error: {str(e)}"
        )


async def reindex_context_background(context_id: str, organization_id: str):
    documents_dir = os.path.join(settings.UPLOAD_DIR, organization_id, context_id)
    if not os.path.exists(documents_dir):
        return

    processor = DocumentProcessor()
    embedding_service = EmbeddingService()
    vector_store = VectorStore()

    vector_store.delete_collection(organization_id, context_id)

    for doc_dir in os.listdir(documents_dir):
        doc_path = os.path.join(documents_dir, doc_dir)
        if not os.path.isdir(doc_path):
            continue

        files = os.listdir(doc_path)
        if not files:
            continue

        file_path = os.path.join(doc_path, files[0])

        is_crawl = doc_dir.startswith("crawl_")
        crawl_url = ""
        crawl_name = files[0]
        if is_crawl:
            try:
                import json
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    raw = f.read()
                data = json.loads(raw)
                if isinstance(data, dict):
                    crawl_url = data.get("source_url", "")
                    crawl_name = crawl_url or data.get("text", "").split("Sumber: ")[1].split("\n")[0] if "Sumber: " in data.get("text", "") else files[0]
            except (json.JSONDecodeError, ValueError):
                import re
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    raw = f.read()
                url_match = re.search(r'Sumber:\s*(https?://\S+)', raw)
                if url_match:
                    crawl_url = url_match.group(1)
                    crawl_name = crawl_url
                else:
                    crawl_name = doc_dir

        try:
            chunks = processor.process_document(file_path)
            if chunks:
                if is_crawl:
                    for chunk in chunks:
                        chunk["source_type"] = "crawl"
                        chunk["source_url"] = crawl_url

                texts = [chunk["content"] for chunk in chunks]
                embeddings = embedding_service.embed_texts(texts)
                vector_store.add_documents(
                    organization_id=organization_id,
                    context_id=context_id,
                    document_id=doc_dir,
                    document_name=crawl_name,
                    chunks=chunks,
                    embeddings=embeddings,
                )
        except Exception:
            continue


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_id: str = Form(...),
    document_name: str = Form(...),
    context_id: str = Form(...),
    organization_id: str = Form(...),
):
    allowed_extensions = {".pdf", ".docx", ".doc", ".txt", ".md"}
    file_ext = os.path.splitext(file.filename or "")[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Tipe file tidak didukung. Didukung: {', '.join(allowed_extensions)}",
        )

    doc_dir = os.path.join(
        settings.UPLOAD_DIR, organization_id, context_id, document_id
    )
    os.makedirs(doc_dir, exist_ok=True)

    save_path = os.path.join(doc_dir, file.filename)
    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)

    _update_status(
        document_id, DocumentStatus.UPLOADED, "Uploaded", 10, 0,
        "File berhasil diupload. Memulai proses..."
    )

    background_tasks.add_task(
        process_document_background,
        save_path,
        document_id,
        document_name,
        context_id,
        organization_id,
    )

    return UploadResponse(
        document_id=document_id,
        filename=file.filename or document_name,
        status=DocumentStatus.UPLOADED,
        message="File uploaded. Processing started.",
    )


@router.get("/status/{document_id}", response_model=ProcessingStatus)
async def get_document_status(document_id: str):
    if document_id not in processing_status_store:
        return ProcessingStatus(
            document_id=document_id,
            status=DocumentStatus.READY,
            phase="Unknown",
            progress=100,
            chunks_count=0,
            message="No processing record found. Document may have been processed earlier.",
        )
    return processing_status_store[document_id]


@router.delete("/delete")
async def delete_document(request: DeleteRequest):
    vector_store = VectorStore()

    chunks_deleted = vector_store.delete_document(
        organization_id=request.organization_id,
        context_id=request.context_id,
        document_id=request.document_id,
    )

    doc_dir = os.path.join(
        settings.UPLOAD_DIR, request.organization_id, request.context_id, request.document_id
    )
    if os.path.exists(doc_dir):
        shutil.rmtree(doc_dir)

    if request.document_id in processing_status_store:
        del processing_status_store[request.document_id]

    return {
        "success": True,
        "document_id": request.document_id,
        "chunks_deleted": chunks_deleted,
        "message": "Document deleted and vectors removed.",
    }


@router.post("/reindex")
async def reindex_context(
    background_tasks: BackgroundTasks, request: ReindexRequest
):
    background_tasks.add_task(
        reindex_context_background,
        request.context_id,
        request.organization_id,
    )
    return {
        "success": True,
        "message": "Re-indexing started in background.",
        "context_id": request.context_id,
    }


@router.get("/stats/{organization_id}/{context_id}")
async def get_collection_stats(organization_id: str, context_id: str):
    vector_store = VectorStore()
    stats = vector_store.get_collection_stats(organization_id, context_id)
    return stats
