import chromadb
from typing import Optional
from config import get_settings

settings = get_settings()


class VectorStore:
    def __init__(self):
        self._client: Optional[chromadb.HttpClient] = None

    @property
    def client(self) -> chromadb.HttpClient:
        if self._client is None:
            self._client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
            )
            try:
                self._client.heartbeat()
            except Exception:
                pass
        return self._client

    def _collection_name(self, organization_id: str, context_id: str) -> str:
        safe_org = organization_id.replace("-", "_").replace(" ", "_")
        safe_ctx = context_id.replace("-", "_").replace(" ", "_")
        return f"org_{safe_org}_ctx_{safe_ctx}"

    def get_or_create_collection(self, organization_id: str, context_id: str):
        name = self._collection_name(organization_id, context_id)
        return self.client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(
        self,
        organization_id: str,
        context_id: str,
        document_id: str,
        document_name: str,
        chunks: list[dict],
        embeddings: list[list[float]],
    ):
        collection = self.get_or_create_collection(organization_id, context_id)

        ids = []
        metadatas = []
        documents = []

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_id = f"{document_id}_chunk_{i}"
            ids.append(chunk_id)
            metadatas.append(
                {
                    "document_id": document_id,
                    "document_name": document_name,
                    "chunk_index": i,
                    "start_char": chunk.get("start_char", 0),
                    "end_char": chunk.get("end_char", 0),
                    "source_type": chunk.get("source_type", "document"),
                    "source_url": chunk.get("source_url", ""),
                }
            )
            documents.append(chunk["content"])

        batch_size = 500
        for i in range(0, len(ids), batch_size):
            batch_ids = ids[i : i + batch_size]
            batch_embeddings = embeddings[i : i + batch_size]
            batch_documents = documents[i : i + batch_size]
            batch_metadatas = metadatas[i : i + batch_size]

            collection.add(
                ids=batch_ids,
                embeddings=batch_embeddings,
                documents=batch_documents,
                metadatas=batch_metadatas,
            )

        return len(ids)

    def query(
        self,
        organization_id: str,
        context_id: str,
        query_embedding: list[float],
        top_k: int = 5,
    ) -> list[dict]:
        collection = self.get_or_create_collection(organization_id, context_id)

        count = collection.count()
        if count == 0:
            return []

        actual_k = min(top_k, count)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=actual_k,
            include=["documents", "metadatas", "distances"],
        )

        sources = []
        if results and results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 0
                score = 1 - distance

                sources.append(
                    {
                        "document_id": metadata.get("document_id", ""),
                        "document_name": metadata.get("document_name", ""),
                        "chunk_index": metadata.get("chunk_index", 0),
                        "content": doc,
                        "score": round(score, 4),
                        "source_type": metadata.get("source_type", "document"),
                        "source_url": metadata.get("source_url", ""),
                    }
                )

        return sources

    def delete_document(
        self, organization_id: str, context_id: str, document_id: str
    ):
        collection = self.get_or_create_collection(organization_id, context_id)

        all_ids = collection.get(
            where={"document_id": document_id},
            include=[],
        )

        if all_ids and all_ids["ids"]:
            collection.delete(ids=all_ids["ids"])

        return len(all_ids.get("ids", []))

    def delete_collection(self, organization_id: str, context_id: str):
        name = self._collection_name(organization_id, context_id)
        try:
            self.client.delete_collection(name)
        except Exception:
            pass

    def get_collection_stats(self, organization_id: str, context_id: str) -> dict:
        collection = self.get_or_create_collection(organization_id, context_id)
        count = collection.count()

        doc_ids = set()
        if count > 0:
            peek = collection.peek(limit=min(count, 1000))
            if peek and peek.get("metadatas"):
                for m in peek["metadatas"]:
                    doc_ids.add(m.get("document_id", ""))

        return {
            "total_chunks": count,
            "unique_documents": len(doc_ids),
        }
