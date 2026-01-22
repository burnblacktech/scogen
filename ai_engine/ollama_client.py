"""
Ollama Client - LLM Inference
"""
import httpx
from typing import Optional, Dict, Any, List
from app.config import settings


class OllamaClient:
    """Client for interacting with Ollama LLM"""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.OLLAMA_HOST
        self.model = settings.OLLAMA_MODEL
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generate text completion from Ollama
        
        Args:
            prompt: User prompt
            system: System message (optional)
            temperature: Sampling temperature (0.0 - 1.0)
            max_tokens: Maximum tokens to generate
        
        Returns:
            Generated text
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
            }
        }
        
        if system:
            payload["system"] = system
        
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens
        
        response = await self.client.post(
            f"{self.base_url}/api/generate",
            json=payload
        )
        response.raise_for_status()
        
        result = response.json()
        return result.get("response", "")
    
    async def embed(self, text: str) -> List[float]:
        """
        Generate embeddings for text
        
        Args:
            text: Text to embed
        
        Returns:
            Embedding vector (1536 dimensions)
        """
        payload = {
            "model": "nomic-embed-text",
            "prompt": text
        }
        
        response = await self.client.post(
            f"{self.base_url}/api/embeddings",
            json=payload
        )
        response.raise_for_status()
        
        result = response.json()
        return result.get("embedding", [])
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7
    ) -> str:
        """
        Chat completion with message history
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
        
        Returns:
            Assistant response
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        
        response = await self.client.post(
            f"{self.base_url}/api/chat",
            json=payload
        )
        response.raise_for_status()
        
        result = response.json()
        return result.get("message", {}).get("content", "")
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# Singleton instance
_ollama_client: Optional[OllamaClient] = None


def get_ollama_client() -> OllamaClient:
    """Get or create Ollama client singleton"""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client
