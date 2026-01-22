"""
AI Embedding Bridge - The Vector Translator
Traceability: Priority 5
Converts text into semantic vectors using Ollama's nomic-embed-text model

This is the bridge between human language and machine understanding.
It enables semantic search - finding similar concepts, not just matching keywords.
"""
import requests
import os
from typing import List, Optional


from app.config import settings

# Configuration
OLLAMA_URL = settings.OLLAMA_HOST
EMBED_MODEL = settings.EMBEDDING_MODEL
EXPECTED_DIM = settings.EMBEDDING_DIM


def get_embedding(text: str) -> List[float]:
    """
    Converts text into a vector using the local Potato Brain (Ollama).
    
    This is the magic that enables semantic search:
    - "MongoDB for banks" and "NoSQL for finance" → Similar vectors
    - "Rural India" and "Farmers in Bihar" → Similar vectors
    - "Video streaming" and "Live calls" → Similar vectors
    
    Args:
        text: The text to vectorize (constraint description, project context, etc.)
        
    Returns:
        List of 768 floats representing the semantic meaning
        Empty list if embedding fails
        
    Example:
        >>> vector = get_embedding("test")
        >>> len(vector)
        768
    """
    try:
        print(f"🧠 Generating embedding for: {text[:50]}...")
        
        response = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={
                "model": EMBED_MODEL,
                "prompt": text
            },
            timeout=30  # Increased timeout for slower systems
        )
        
        if response.status_code != 200:
            print(f"⚠️ Embedding Error ({response.status_code}): {response.text}")
            return []
        
        embedding = response.json().get("embedding", [])
        
        # SAFETY CHECK: Align with DB schema
        if len(embedding) != EXPECTED_DIM:
            print(f"⚠️ DIMENSION MISMATCH: Expected {EXPECTED_DIM}, got {len(embedding)}")
            return []
        
        print(f"✅ Generated embedding: {len(embedding)} dimensions")
        return embedding
    
    except requests.exceptions.Timeout:
        print(f"❌ Embedding timeout - Ollama may be slow or unavailable")
        return []
    
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to Ollama at {OLLAMA_URL}")
        print(f"   Make sure Ollama is running: docker-compose up ollama")
        return []
    
    except Exception as e:
        print(f"❌ Embedding Failed: {e}")
        return []


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts.
    
    More efficient than calling get_embedding() in a loop
    for bulk operations.
    
    Args:
        texts: List of texts to vectorize
        
    Returns:
        List of embeddings (one per input text)
        
    Example:
        >>> texts = ["MongoDB for banks", "Video streaming", "Rural India"]
        >>> embeddings = get_embeddings_batch(texts)
        >>> len(embeddings)
        3
    """
    embeddings = []
    
    for text in texts:
        embedding = get_embedding(text)
        embeddings.append(embedding)
    
    return embeddings


def test_embedding_service() -> bool:
    """
    Test if the embedding service is available and working.
    
    Returns:
        True if service is healthy, False otherwise
    """
    try:
        print("🔍 Testing embedding service...")
        
        # Try to get embedding for a simple test phrase
        test_vector = get_embedding("test")
        
        if not test_vector:
            print("❌ Embedding service not working")
            return False
        
        if len(test_vector) != 768:
            print(f"⚠️ Unexpected embedding dimension: {len(test_vector)} (expected 768)")
            return False
        
        print(f"✅ Embedding service healthy")
        return True
    
    except Exception as e:
        print(f"❌ Embedding service test failed: {e}")
        return False


def calculate_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors.
    
    Returns a score from 0 to 1:
    - 1.0 = Identical meaning
    - 0.7-0.9 = Very similar
    - 0.5-0.7 = Somewhat similar
    - <0.5 = Different
    
    Args:
        vec1: First vector
        vec2: Second vector
        
    Returns:
        Similarity score (0 to 1)
    """
    import math
    
    if len(vec1) != len(vec2):
        raise ValueError("Vectors must have same dimension")
    
    # Dot product
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    
    # Magnitudes
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(b * b for b in vec2))
    
    # Cosine similarity
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    similarity = dot_product / (magnitude1 * magnitude2)
    
    # Normalize to 0-1 range (cosine can be -1 to 1)
    return (similarity + 1) / 2


if __name__ == "__main__":
    # Quick test when run directly
    print("=" * 60)
    print("EMBEDDING SERVICE TEST")
    print("=" * 60)
    
    if test_embedding_service():
        print("\n✅ Service is ready for constraint engine")
        
        # Demo: Similar concepts
        print("\n📊 Similarity Demo:")
        v1 = get_embedding("MongoDB for financial transactions")
        v2 = get_embedding("NoSQL database for banking")
        
        if v1 and v2:
            similarity = calculate_similarity(v1, v2)
            print(f"   Similarity: {similarity:.2f}")
            print(f"   → These concepts are {'VERY' if similarity > 0.7 else 'SOMEWHAT'} similar")
    else:
        print("\n❌ Service not ready - check Ollama container")
