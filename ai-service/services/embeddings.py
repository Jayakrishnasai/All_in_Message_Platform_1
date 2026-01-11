"""
Embedding Service
=================
Generate text embeddings using sentence-transformers.
"""

from typing import List, Optional
import numpy as np
import structlog

logger = structlog.get_logger()


class EmbeddingService:
    """Service for generating text embeddings."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding service.
        
        Args:
            model_name: Sentence-transformer model name
        """
        self.model_name = model_name
        self.model = None
        self.embedding_dim = 384  # Default for MiniLM
        
        self._load_model()
    
    def _load_model(self):
        """Load the sentence transformer model."""
        try:
            from sentence_transformers import SentenceTransformer
            
            logger.info("Loading embedding model", model=self.model_name)
            self.model = SentenceTransformer(self.model_name)
            self.embedding_dim = self.model.get_sentence_embedding_dimension()
            logger.info("Embedding model loaded", dim=self.embedding_dim)
            
        except Exception as e:
            logger.error("Failed to load embedding model", error=str(e))
            self.model = None
    
    def embed(self, text: str) -> Optional[np.ndarray]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Numpy array of embedding or None
        """
        if not text or not self.model:
            return None
        
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding
        except Exception as e:
            logger.error("Embedding failed", error=str(e))
            return None
    
    def embed_batch(
        self,
        texts: List[str],
        batch_size: int = 32
    ) -> Optional[np.ndarray]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            batch_size: Batch size for processing
            
        Returns:
            Numpy array of embeddings (N x dim) or None
        """
        if not texts or not self.model:
            return None
        
        try:
            # Filter out empty texts
            valid_texts = [t for t in texts if t and len(t.strip()) > 0]
            
            if not valid_texts:
                return None
            
            embeddings = self.model.encode(
                valid_texts,
                batch_size=batch_size,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            
            logger.info("Batch embedding completed", count=len(valid_texts))
            return embeddings
            
        except Exception as e:
            logger.error("Batch embedding failed", error=str(e))
            return None
    
    def similarity(
        self,
        text1: str,
        text2: str
    ) -> float:
        """
        Calculate cosine similarity between two texts.
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score (0-1)
        """
        emb1 = self.embed(text1)
        emb2 = self.embed(text2)
        
        if emb1 is None or emb2 is None:
            return 0.0
        
        return self._cosine_similarity(emb1, emb2)
    
    def _cosine_similarity(
        self,
        vec1: np.ndarray,
        vec2: np.ndarray
    ) -> float:
        """Calculate cosine similarity between two vectors."""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
    
    def find_most_similar(
        self,
        query: str,
        candidates: List[str],
        top_k: int = 5
    ) -> List[dict]:
        """
        Find most similar texts to query.
        
        Args:
            query: Query text
            candidates: List of candidate texts
            top_k: Number of results to return
            
        Returns:
            List of {text, score} dictionaries
        """
        query_emb = self.embed(query)
        if query_emb is None:
            return []
        
        candidate_embs = self.embed_batch(candidates)
        if candidate_embs is None:
            return []
        
        # Calculate similarities
        similarities = []
        for i, (text, emb) in enumerate(zip(candidates, candidate_embs)):
            score = self._cosine_similarity(query_emb, emb)
            similarities.append({"text": text, "score": score, "index": i})
        
        # Sort by score (descending)
        similarities.sort(key=lambda x: x["score"], reverse=True)
        
        return similarities[:top_k]
    
    def get_dimension(self) -> int:
        """Get embedding dimension."""
        return self.embedding_dim
