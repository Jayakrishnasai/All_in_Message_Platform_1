"""
Summarization Service
=====================
Text summarization using Hugging Face Transformers (BART model).
"""

from typing import List, Optional
import structlog

logger = structlog.get_logger()


class SummarizerService:
    """Service for generating conversation summaries using BART."""
    
    def __init__(self, model_name: str = "facebook/bart-large-cnn"):
        """
        Initialize the summarizer.
        
        Args:
            model_name: Hugging Face model name for summarization
        """
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self._ready = False
        
        self._load_model()
    
    def _load_model(self):
        """Load the summarization model."""
        try:
            from transformers import pipeline, BartTokenizer, BartForConditionalGeneration
            
            logger.info("Loading summarization model", model=self.model_name)
            
            # Use pipeline for easier inference
            self.summarizer = pipeline(
                "summarization",
                model=self.model_name,
                device=-1  # CPU, use 0 for GPU
            )
            
            self._ready = True
            logger.info("Summarization model loaded successfully")
            
        except Exception as e:
            logger.error("Failed to load summarization model", error=str(e))
            # Fallback to simple extractive summarization
            self.summarizer = None
            self._ready = True  # Still ready, just using fallback
    
    def is_ready(self) -> bool:
        """Check if the service is ready."""
        return self._ready
    
    def summarize(
        self,
        messages: List[str],
        max_length: int = 150,
        min_length: int = 30
    ) -> str:
        """
        Generate a summary of the given messages.
        
        Args:
            messages: List of message strings to summarize
            max_length: Maximum length of the summary
            min_length: Minimum length of the summary
            
        Returns:
            Summary string
        """
        if not messages:
            return ""
        
        # Combine messages into a single text
        combined_text = self._prepare_text(messages)
        
        if not combined_text:
            return "No content to summarize."
        
        # Check if text is too short
        if len(combined_text.split()) < 30:
            return combined_text
        
        if self.summarizer:
            return self._model_summarize(combined_text, max_length, min_length)
        else:
            return self._extractive_summarize(messages, max_length)
    
    def _prepare_text(self, messages: List[str]) -> str:
        """Prepare messages for summarization."""
        # Filter out very short messages and combine
        filtered = [msg.strip() for msg in messages if len(msg.strip()) > 3]
        
        # Join with sentence separators
        combined = ". ".join(filtered)
        
        # Limit total length to avoid model issues
        max_chars = 4000
        if len(combined) > max_chars:
            combined = combined[:max_chars]
        
        return combined
    
    def _model_summarize(
        self,
        text: str,
        max_length: int,
        min_length: int
    ) -> str:
        """Use the BART model for summarization."""
        try:
            result = self.summarizer(
                text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False
            )
            
            if result and len(result) > 0:
                return result[0]["summary_text"]
            
            return "Unable to generate summary."
            
        except Exception as e:
            logger.error("Model summarization failed", error=str(e))
            return self._extractive_summarize([text], max_length)
    
    def _extractive_summarize(
        self,
        messages: List[str],
        max_length: int
    ) -> str:
        """
        Fallback: Simple extractive summarization.
        Selects the most important sentences based on word frequency.
        """
        from collections import Counter
        import re
        
        # Combine and split into sentences
        combined = " ".join(messages)
        sentences = re.split(r'[.!?]+', combined)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        if not sentences:
            return "No content to summarize."
        
        # Calculate word frequencies
        words = re.findall(r'\b[a-zA-Z]{4,}\b', combined.lower())
        word_freq = Counter(words)
        
        # Score sentences by word frequency
        sentence_scores = []
        for sentence in sentences:
            words_in_sentence = re.findall(r'\b[a-zA-Z]+\b', sentence.lower())
            score = sum(word_freq.get(word, 0) for word in words_in_sentence)
            if words_in_sentence:
                score /= len(words_in_sentence)
            sentence_scores.append((sentence, score))
        
        # Sort by score and take top sentences
        sentence_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Build summary up to max_length
        summary_sentences = []
        current_length = 0
        
        for sentence, _ in sentence_scores:
            if current_length + len(sentence) > max_length * 5:  # chars, not words
                break
            summary_sentences.append(sentence)
            current_length += len(sentence)
        
        return ". ".join(summary_sentences) + "." if summary_sentences else "No summary available."
    
    def summarize_conversation(
        self,
        messages: List[dict],
        include_participants: bool = True
    ) -> dict:
        """
        Summarize a conversation with metadata.
        
        Args:
            messages: List of message dictionaries with 'content' and 'sender'
            include_participants: Whether to include participant info
            
        Returns:
            Dictionary with summary and metadata
        """
        contents = [msg.get("content", "") for msg in messages]
        summary = self.summarize(contents)
        
        result = {
            "summary": summary,
            "message_count": len(messages)
        }
        
        if include_participants:
            participants = list(set(msg.get("sender", "Unknown") for msg in messages))
            result["participants"] = participants
            result["participant_count"] = len(participants)
        
        return result
