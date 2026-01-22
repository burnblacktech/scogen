"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5433
    POSTGRES_DB: str = "scogen"
    POSTGRES_USER: str = "scogen"
    POSTGRES_PASSWORD: str = "changeme"
    
    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "changeme"
    MINIO_BUCKET: str = "scogen-assets"
    MINIO_USE_SSL: bool = False
    
    # Ollama
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3:70b"
    OLLAMA_CONTEXT_WINDOW: int = 8192
    EMBEDDING_MODEL: str = "nomic-embed-text"
    EMBEDDING_DIM: int = 768 # Explicitly set to 768 for Nomic
    
    # Whisper
    WHISPER_MODEL: str = "large-v3"
    WHISPER_DEVICE: str = "cuda"
    
    # Application
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    DEBUG: bool = False
    
    # Security
    JWT_SECRET: str = "changeme-generate-secure-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Pricing Engine
    DEFAULT_MARKET_HOURLY_RATE: int = 2500
    MINIMUM_MARGIN_PERCENTAGE: int = 40
    RISK_BUFFER_PERCENTAGE: int = 20
    
    # Feature Flags
    ENABLE_VOICE_INPUT: bool = True
    ENABLE_SHADOW_PRICING: bool = True
    ENABLE_MATURITY_SCORING: bool = True
    
    @property
    def DATABASE_URL(self) -> str:
        """Construct PostgreSQL connection URL"""
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
