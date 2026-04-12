import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from api.schemas import QueryRequest, QueryResponse, StreamQueryRequest, SearchRequest, MultiSearchRequest, GenerateRequest
from services.rag_pipeline import RAGPipeline

router = APIRouter()
rag_pipeline = RAGPipeline()


@router.post("", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    try:
        result = await rag_pipeline.query(
            query=request.query,
            context_id=request.context_id,
            organization_id=request.organization_id,
            top_k=request.top_k,
            api_configs=request.api_configs,
        )
        return QueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def query_rag_stream(request: StreamQueryRequest):
    async def event_generator():
        try:
            async for chunk in rag_pipeline.query_stream(
                query=request.query,
                context_id=request.context_id,
                organization_id=request.organization_id,
                top_k=request.top_k,
                api_configs=request.api_configs,
            ):
                yield chunk
        except Exception as e:
            yield f"data: {{'type': 'error', 'message': '{str(e)}'}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/search")
async def search_documents(request: SearchRequest):
    try:
        sources = rag_pipeline.search(
            query=request.query,
            context_id=request.context_id,
            organization_id=request.organization_id,
            top_k=request.top_k,
        )
        return {"sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/multi")
async def search_multi_documents(request: MultiSearchRequest):
    try:
        sources = rag_pipeline.search_multi(
            query=request.query,
            context_ids=request.context_ids,
            organization_id=request.organization_id,
            top_k=request.top_k,
        )
        return {"sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate", response_model=QueryResponse)
async def generate_answer(request: GenerateRequest):
    try:
        result = await rag_pipeline.generate(
            query=request.query,
            sources=[s.model_dump() for s in request.sources],
            api_results=request.api_results,
        )
        return QueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
