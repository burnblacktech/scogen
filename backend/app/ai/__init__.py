"""
AI Package - The Potato Brain Interface
Utilities for interacting with local AI models (Ollama)
"""
from .embedding import get_embedding, get_embeddings_batch, test_embedding_service

__all__ = [
    "get_embedding",
    "get_embeddings_batch",
    "test_embedding_service"
]
