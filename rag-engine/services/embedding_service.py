from openai import OpenAI
from config import get_settings

settings = get_settings()


class EmbeddingService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.AI_API_KEY,
            base_url=settings.AI_API_BASE_URL,
        )
        self.model = settings.AI_EMBEDDING_MODEL

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        batch_size = 100
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            response = self.client.embeddings.create(
                model=self.model,
                input=batch,
            )
            embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(embeddings)

        return all_embeddings

    def embed_query(self, query: str) -> list[float]:
        response = self.client.embeddings.create(
            model=self.model,
            input=[query],
        )
        return response.data[0].embedding
