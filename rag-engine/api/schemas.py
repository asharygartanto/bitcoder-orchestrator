from pydantic import BaseModel
from typing import Optional
from enum import Enum


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    VECTORIZING = "vectorizing"
    INDEXING = "indexing"
    READY = "ready"
    ERROR = "error"


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    status: DocumentStatus
    message: str


class ProcessingStatus(BaseModel):
    document_id: str
    status: DocumentStatus
    phase: str
    progress: int
    chunks_count: int
    message: str


class QueryRequest(BaseModel):
    query: str
    context_id: str
    organization_id: str
    top_k: int = 5
    api_configs: Optional[list[dict]] = None


class SourceReference(BaseModel):
    document_id: str
    document_name: str
    chunk_index: int
    content: str
    score: float
    source_type: str = "document"


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceReference]
    api_results: Optional[list[dict]] = None
    context_used: int


class StreamQueryRequest(BaseModel):
    query: str
    context_id: str
    organization_id: str
    top_k: int = 5
    api_configs: Optional[list[dict]] = None


class DeleteRequest(BaseModel):
    document_id: str
    context_id: str
    organization_id: str


class ReindexRequest(BaseModel):
    context_id: str
    organization_id: str


class SearchRequest(BaseModel):
    query: str
    context_id: str
    organization_id: str
    top_k: int = 5


class MultiSearchRequest(BaseModel):
    query: str
    context_ids: list[str]
    organization_id: str
    top_k: int = 5


class GatherApiRequest(BaseModel):
    query: str
    api_configs: list[dict]


class GenerateRequest(BaseModel):
    query: str
    sources: list[SourceReference]
    api_results: Optional[list[dict]] = None
