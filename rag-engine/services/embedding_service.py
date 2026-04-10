from sentence_transformers import SentenceTransformer
from config import get_settings

settings = get_settings()


class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer(settings.AI_EMBEDDING_MODEL)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        embeddings = self.model.encode(texts, show_progress_bar=False)
        return embeddings.tolist()

    def embed_query(self, query: str) -> list[float]:
        embedding = self.model.encode([query], show_progress_bar=False)
        return embedding[0].tolist()
