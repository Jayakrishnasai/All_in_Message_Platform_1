"""
Vector Store Service
====================
FAISS-based vector storage for semantic search.
"""

import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import structlog

logger = structlog.get_logger()


class VectorStoreService:
    """Service for storing and searching message embeddings using FAISS."""
    
    def __init__(
        self,
        embedding_service,
        storage_path: str = "/app/data/vector_store"
    ):
        """
        Initialize the vector store.
        
        Args:
            embedding_service: EmbeddingService instance
            storage_path: Path to store the index
        """
        self.embedding_service = embedding_service
        self.storage_path = storage_path
        self.index = None
        self.metadata = []  # Store message metadata
        
        self._initialize_index()
    
    def _initialize_index(self):
        """Initialize or load the FAISS index."""
        try:
            import faiss
            
            dim = self.embedding_service.get_dimension()
            
            # Check if existing index exists
            index_path = os.path.join(self.storage_path, "index.faiss")
            metadata_path = os.path.join(self.storage_path, "metadata.json")
            
            if os.path.exists(index_path) and os.path.exists(metadata_path):
                logger.info("Loading existing vector store", path=self.storage_path)
                self.index = faiss.read_index(index_path)
                with open(metadata_path, "r") as f:
                    self.metadata = json.load(f)
            else:
                logger.info("Creating new vector store", dim=dim)
                # Use IndexFlatIP for inner product (cosine similarity with normalized vectors)
                self.index = faiss.IndexFlatIP(dim)
            
            logger.info("Vector store initialized", size=self.index.ntotal)
            
        except Exception as e:
            logger.error("Failed to initialize vector store", error=str(e))
            self.index = None
    
    def add_messages(
        self,
        messages: List[str],
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Add messages to the vector store.
        
        Args:
            messages: List of message texts
            metadata: Optional metadata to store with messages
        """
        if not self.index or not self.embedding_service:
            logger.warning("Vector store not initialized")
            return
        
        try:
            # Generate embeddings
            embeddings = self.embedding_service.embed_batch(messages)
            
            if embeddings is None:
                logger.warning("No embeddings generated")
                return
            
            # Normalize for cosine similarity
            faiss = self._get_faiss()
            if faiss:
                faiss.normalize_L2(embeddings)
            
            # Add to index
            self.index.add(embeddings.astype(np.float32))
            
            # Store metadata
            timestamp = datetime.utcnow().isoformat()
            for msg in messages:
                self.metadata.append({
                    "content": msg,
                    "timestamp": timestamp,
                    **(metadata or {})
                })
            
            logger.info("Added messages to vector store", count=len(messages))
            
        except Exception as e:
            logger.error("Failed to add messages", error=str(e))
    
    def search(
        self,
        query: str,
        top_k: int = 10,
        threshold: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Search for similar messages.
        
        Args:
            query: Query text
            top_k: Number of results to return
            threshold: Minimum similarity score
            
        Returns:
            List of result dictionaries
        """
        if not self.index or self.index.ntotal == 0:
            return []
        
        try:
            # Generate query embedding
            query_emb = self.embedding_service.embed(query)
            if query_emb is None:
                return []
            
            # Normalize
            query_emb = query_emb.reshape(1, -1).astype(np.float32)
            faiss = self._get_faiss()
            if faiss:
                faiss.normalize_L2(query_emb)
            
            # Search
            scores, indices = self.index.search(query_emb, min(top_k, self.index.ntotal))
            
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < 0 or score < threshold:
                    continue
                
                if idx < len(self.metadata):
                    result = {
                        "content": self.metadata[idx].get("content", ""),
                        "score": float(score),
                        "metadata": self.metadata[idx]
                    }
                    results.append(result)
            
            return results
            
        except Exception as e:
            logger.error("Search failed", error=str(e))
            return []
    
    def save(self):
        """Save the index and metadata to disk."""
        if not self.index:
            return
        
        try:
            os.makedirs(self.storage_path, exist_ok=True)
            
            faiss = self._get_faiss()
            if faiss:
                index_path = os.path.join(self.storage_path, "index.faiss")
                faiss.write_index(self.index, index_path)
            
            metadata_path = os.path.join(self.storage_path, "metadata.json")
            with open(metadata_path, "w") as f:
                json.dump(self.metadata, f)
            
            logger.info("Vector store saved", path=self.storage_path)
            
        except Exception as e:
            logger.error("Failed to save vector store", error=str(e))
    
    def clear(self):
        """Clear the vector store."""
        try:
            dim = self.embedding_service.get_dimension()
            faiss = self._get_faiss()
            if faiss:
                self.index = faiss.IndexFlatIP(dim)
            self.metadata = []
            logger.info("Vector store cleared")
        except Exception as e:
            logger.error("Failed to clear vector store", error=str(e))
    
    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics."""
        return {
            "total_vectors": self.index.ntotal if self.index else 0,
            "metadata_count": len(self.metadata),
            "dimension": self.embedding_service.get_dimension()
        }
    
    def _get_faiss(self):
        """Get faiss module."""
        try:
            import faiss
            return faiss
        except ImportError:
            return None
