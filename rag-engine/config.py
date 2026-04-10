from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    AI_API_KEY: str = ""
    AI_API_BASE_URL: str = "https://api.bitcoder.ai/v1"
    AI_CHAT_MODEL: str = "bitcoder-chat"
    AI_EMBEDDING_MODEL: str = "bitcoder-embedding"
    AI_MAX_TOKENS: int = 4096
    AI_TEMPERATURE: float = 0.7

    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_PERSIST_DIR: str = "./chroma_data"

    UPLOAD_DIR: str = "./uploads"

    RAG_ENGINE_PORT: int = 8000

    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K_RESULTS: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
