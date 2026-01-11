"""
Knowledge Base Service
======================
Extract and store Q&A pairs from conversations.
"""

from typing import List, Dict, Any, Optional
import re
from datetime import datetime
import structlog

logger = structlog.get_logger()


class KnowledgeBaseService:
    """Service for building a knowledge base from conversations."""
    
    # Question patterns
    QUESTION_PATTERNS = [
        r'^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did)\b.*\?$',
        r'^.*\?$',
        r'^(tell me|explain|describe|show me)\b.*',
        r'^i\s+(want|need|would like)\s+to\s+know\b.*'
    ]
    
    def __init__(self, vector_store=None):
        """
        Initialize the knowledge base.
        
        Args:
            vector_store: VectorStoreService for semantic search
        """
        self.vector_store = vector_store
        self.entries = []  # In-memory storage
    
    def extract_from_messages(
        self,
        messages: List[str],
        room_id: Optional[str] = None
    ):
        """
        Extract Q&A pairs from a list of messages.
        
        Args:
            messages: List of message texts
            room_id: Source room ID
        """
        logger.info("Extracting knowledge from messages", count=len(messages))
        
        # Group messages into potential Q&A pairs
        qa_pairs = self._extract_qa_pairs(messages)
        
        for q, a in qa_pairs:
            entry = {
                "question": q,
                "answer": a,
                "source_room": room_id or "unknown",
                "confidence": self._calculate_confidence(q, a),
                "created_at": datetime.utcnow().isoformat()
            }
            self.entries.append(entry)
            
            # Add to vector store for semantic search
            if self.vector_store:
                self.vector_store.add_messages(
                    [q, a],
                    {"type": "knowledge_entry", "room_id": room_id}
                )
        
        logger.info("Extracted knowledge entries", count=len(qa_pairs))
    
    def _extract_qa_pairs(
        self,
        messages: List[str]
    ) -> List[tuple]:
        """Extract question-answer pairs from sequential messages."""
        pairs = []
        
        for i in range(len(messages) - 1):
            current = messages[i].strip()
            next_msg = messages[i + 1].strip()
            
            # Check if current message looks like a question
            if self._is_question(current):
                # Check if next message looks like an answer
                if self._is_answer(next_msg, current):
                    pairs.append((current, next_msg))
        
        return pairs
    
    def _is_question(self, message: str) -> bool:
        """Determine if a message is a question."""
        message_lower = message.lower()
        
        # Check patterns
        for pattern in self.QUESTION_PATTERNS:
            if re.match(pattern, message_lower):
                return True
        
        # Additional heuristics
        question_starters = [
            'what', 'how', 'why', 'when', 'where', 'who', 'which',
            'can you', 'could you', 'would you', 'is there', 'are there',
            'do you', 'does it', 'did you'
        ]
        
        for starter in question_starters:
            if message_lower.startswith(starter):
                return True
        
        return False
    
    def _is_answer(self, message: str, question: str) -> bool:
        """Determine if a message is likely an answer to a question."""
        # Reject very short answers
        if len(message) < 10:
            return False
        
        # Reject if it's also a question
        if self._is_question(message):
            return False
        
        # Check for answer indicators
        answer_indicators = [
            'you can', 'you should', 'to do this', 'the answer is',
            'yes,', 'no,', 'sure,', 'basically', 'essentially',
            'it is', 'it\'s', 'they are', 'this is'
        ]
        
        message_lower = message.lower()
        for indicator in answer_indicators:
            if indicator in message_lower:
                return True
        
        # Accept if message is reasonably long and not a question
        if len(message) > 50:
            return True
        
        return False
    
    def _calculate_confidence(self, question: str, answer: str) -> float:
        """Calculate confidence score for a Q&A pair."""
        confidence = 0.5  # Base confidence
        
        # Boost for clear question format
        if question.endswith('?'):
            confidence += 0.1
        
        # Boost for longer answers
        if len(answer) > 100:
            confidence += 0.1
        if len(answer) > 200:
            confidence += 0.1
        
        # Boost for answer indicators
        answer_lower = answer.lower()
        if any(ind in answer_lower for ind in ['because', 'therefore', 'so that', 'in order to']):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def get_entries(
        self,
        room_id: Optional[str] = None,
        limit: int = 50,
        min_confidence: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Get knowledge base entries.
        
        Args:
            room_id: Filter by source room
            limit: Maximum entries to return
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of knowledge entries
        """
        filtered = self.entries
        
        if room_id:
            filtered = [e for e in filtered if e["source_room"] == room_id]
        
        if min_confidence > 0:
            filtered = [e for e in filtered if e["confidence"] >= min_confidence]
        
        # Sort by confidence (descending)
        filtered.sort(key=lambda x: x["confidence"], reverse=True)
        
        return filtered[:limit]
    
    def search(
        self,
        query: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search knowledge base for relevant entries.
        
        Args:
            query: Search query
            top_k: Number of results
            
        Returns:
            List of matching entries with scores
        """
        if self.vector_store:
            # Use semantic search
            results = self.vector_store.search(query, top_k=top_k * 2)
            
            # Match back to entries
            matched = []
            for result in results:
                content = result.get("content", "")
                for entry in self.entries:
                    if entry["question"] == content or entry["answer"] == content:
                        matched.append({
                            **entry,
                            "search_score": result["score"]
                        })
                        break
            
            return matched[:top_k]
        else:
            # Fallback to keyword search
            return self._keyword_search(query, top_k)
    
    def _keyword_search(
        self,
        query: str,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Simple keyword-based search."""
        query_words = set(query.lower().split())
        
        scored = []
        for entry in self.entries:
            text = f"{entry['question']} {entry['answer']}".lower()
            text_words = set(text.split())
            
            overlap = len(query_words & text_words)
            if overlap > 0:
                score = overlap / len(query_words)
                scored.append({**entry, "search_score": score})
        
        scored.sort(key=lambda x: x["search_score"], reverse=True)
        return scored[:top_k]
    
    def add_entry(
        self,
        question: str,
        answer: str,
        room_id: str = "manual",
        confidence: float = 1.0
    ):
        """
        Manually add a knowledge entry.
        
        Args:
            question: Question text
            answer: Answer text
            room_id: Source identifier
            confidence: Confidence score
        """
        entry = {
            "question": question,
            "answer": answer,
            "source_room": room_id,
            "confidence": confidence,
            "created_at": datetime.utcnow().isoformat()
        }
        self.entries.append(entry)
        
        if self.vector_store:
            self.vector_store.add_messages(
                [question, answer],
                {"type": "knowledge_entry", "room_id": room_id}
            )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics."""
        rooms = set(e["source_room"] for e in self.entries)
        avg_confidence = sum(e["confidence"] for e in self.entries) / max(len(self.entries), 1)
        
        return {
            "total_entries": len(self.entries),
            "unique_rooms": len(rooms),
            "average_confidence": round(avg_confidence, 2)
        }
