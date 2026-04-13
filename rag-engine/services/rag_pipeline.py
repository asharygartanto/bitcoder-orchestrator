from openai import OpenAI
from typing import AsyncIterator, Optional
import json
from config import get_settings
from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore
from services.api_context import ApiContextService
from api.schemas import SourceReference

settings = get_settings()


class RAGPipeline:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStore()
        self.api_context = ApiContextService()
        self.client = OpenAI(
            api_key=settings.AI_API_KEY,
            base_url=settings.AI_API_BASE_URL,
        )
        self.model = settings.AI_CHAT_MODEL

    def _build_system_prompt(
        self,
        context_chunks: list[dict],
        api_results: Optional[list[dict]] = None,
    ) -> str:
        context_parts = []

        if context_chunks:
            context_parts.append("## Dokumen Referensi")
            for i, chunk in enumerate(context_chunks, 1):
                doc_name = chunk.get("document_name", "Unknown")
                content = chunk.get("content", "")
                context_parts.append(f"[Dokumen: {doc_name}]\n{content}")

        if api_results:
            context_parts.append("## Data dari API")
            for api_result in api_results:
                api_name = api_result.get("api_name", "Unknown API")
                data = api_result.get("data", {})
                context_parts.append(f"[API: {api_name}]\n{data}")

        context_text = "\n\n".join(context_parts)

        return (
            "Kamu adalah asisten AI Bitcoder yang membantu menjawab pertanyaan berdasarkan "
            "konteks yang diberikan. Jawablah dengan bahasa yang sama dengan pertanyaan user. "
            "Gunakan informasi dari dokumen referensi dan data API yang tersedia. "
            "Jika informasi tidak tersedia dalam konteks, katakan dengan jujur bahwa kamu tidak memiliki informasi tersebut. "
            "JANGAN menyertakan daftar referensi atau sumber di akhir jawabanmu. "
            "JANGAN menyebutkan nama file dokumen di jawabanmu.\n\n"
            f"### Konteks:\n{context_text}"
        )

    async def query(
        self,
        query: str,
        context_id: str,
        organization_id: str,
        top_k: int = 5,
        api_configs: Optional[list[dict]] = None,
    ) -> dict:
        query_embedding = self.embedding_service.embed_query(query)

        sources = self.vector_store.query(
            organization_id=organization_id,
            context_id=context_id,
            query_embedding=query_embedding,
            top_k=top_k,
        )

        api_results = None
        if api_configs:
            api_results = await self.api_context.gather_api_contexts(api_configs)

        context_chunks = [
            {
                "document_name": s["document_name"],
                "content": s["content"],
            }
            for s in sources
        ]

        system_prompt = self._build_system_prompt(context_chunks, api_results)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query},
            ],
            max_tokens=settings.AI_MAX_TOKENS,
            temperature=settings.AI_TEMPERATURE,
        )

        answer = response.choices[0].message.content or ""

        return {
            "answer": answer,
            "sources": sources,
            "api_results": api_results,
            "context_used": len(sources),
        }

    async def query_stream(
        self,
        query: str,
        context_id: str,
        organization_id: str,
        top_k: int = 5,
        api_configs: Optional[list[dict]] = None,
    ) -> AsyncIterator[str]:
        query_embedding = self.embedding_service.embed_query(query)

        sources = self.vector_store.query(
            organization_id=organization_id,
            context_id=context_id,
            query_embedding=query_embedding,
            top_k=top_k,
        )

        api_results = None
        if api_configs:
            api_results = await self.api_context.gather_api_contexts(api_configs)

        context_chunks = [
            {
                "document_name": s["document_name"],
                "content": s["content"],
            }
            for s in sources
        ]

        system_prompt = self._build_system_prompt(context_chunks, api_results)

        sources_json = "[" + ",".join(
            f'{{"document_name":"{s["document_name"]}","score":{s["score"]},"source_type":"{s["source_type"]}"}}'
            for s in sources
        ) + "]"

        metadata_event = f"data: {{'type': 'metadata', 'sources': {sources_json}, 'api_results': {str(api_results)}, 'context_used': {len(sources)}}}\n\n"
        yield metadata_event

        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query},
            ],
            max_tokens=settings.AI_MAX_TOKENS,
            temperature=settings.AI_TEMPERATURE,
            stream=True,
        )

        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                yield f"data: {content}\n\n"

        yield "data: [DONE]\n\n"

    def search(self, query: str, context_id: str, organization_id: str, top_k: int = 5) -> list[dict]:
        query_embedding = self.embedding_service.embed_query(query)
        return self.vector_store.query(
            organization_id=organization_id,
            context_id=context_id,
            query_embedding=query_embedding,
            top_k=top_k,
        )

    def search_multi(self, query: str, context_ids: list[str], organization_id: str, top_k: int = 5) -> list[dict]:
        query_embedding = self.embedding_service.embed_query(query)
        all_sources = []
        for ctx_id in context_ids:
            try:
                results = self.vector_store.query(
                    organization_id=organization_id,
                    context_id=ctx_id,
                    query_embedding=query_embedding,
                    top_k=3,
                )
                all_sources.extend(results)
            except Exception:
                continue
        all_sources.sort(key=lambda s: s.get("score", 0), reverse=True)
        return all_sources[:top_k]

    async def generate(self, query: str, sources: list[dict], api_results: Optional[list[dict]] = None) -> dict:
        context_chunks = [
            {"document_name": s["document_name"], "content": s["content"]}
            for s in sources
        ]
        system_prompt = self._build_system_prompt(context_chunks, api_results)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query},
            ],
            max_tokens=settings.AI_MAX_TOKENS,
            temperature=settings.AI_TEMPERATURE,
        )

        answer = response.choices[0].message.content or ""

        return {
            "answer": answer,
            "sources": sources,
            "api_results": api_results,
            "context_used": len(sources),
        }

    async def generate_stream(self, query: str, sources: list[dict], api_results: Optional[list[dict]] = None) -> AsyncIterator[str]:
        context_chunks = [
            {"document_name": s["document_name"], "content": s["content"]}
            for s in sources
        ]
        system_prompt = self._build_system_prompt(context_chunks, api_results)

        sources_meta = [
            {
                "document_id": s.get("document_id", ""),
                "document_name": s.get("document_name", ""),
                "score": s.get("score", 0),
                "source_type": s.get("source_type", "document"),
                "source_url": s.get("source_url", ""),
            }
            for s in sources
        ]
        yield f"data: {json.dumps({'type': 'metadata', 'sources': sources_meta, 'context_used': len(sources)})}\n\n"

        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query},
            ],
            max_tokens=settings.AI_MAX_TOKENS,
            temperature=settings.AI_TEMPERATURE,
            stream=True,
        )

        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                yield f"data: {content}\n\n"

        yield "data: [DONE]\n\n"
