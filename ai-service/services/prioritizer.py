"""
Prioritizer Service
===================
Message prioritization based on intent, keywords, and patterns.
"""

from typing import List, Dict, Any
import re
import structlog

logger = structlog.get_logger()


class PrioritizerService:
    """Service for prioritizing messages based on multiple factors."""
    
    # Urgency keywords with weights
    URGENCY_KEYWORDS = {
        "urgent": 3.0,
        "asap": 3.0,
        "emergency": 3.5,
        "critical": 3.0,
        "immediately": 2.5,
        "help": 1.5,
        "important": 2.0,
        "deadline": 2.5,
        "now": 1.5,
        "today": 1.0,
        "broken": 2.0,
        "error": 1.5,
        "failed": 2.0,
        "down": 2.0,
        "blocked": 2.0,
        "waiting": 1.0,
        "stuck": 1.5,
        "please": 0.5
    }
    
    # Intent weights for prioritization
    INTENT_WEIGHTS = {
        "urgent": 3.0,
        "support": 2.0,
        "sales": 1.5,
        "casual": 0.5
    }
    
    def __init__(self, intent_parser=None):
        """
        Initialize the prioritizer.
        
        Args:
            intent_parser: IntentParserService instance
        """
        self.intent_parser = intent_parser
    
    def prioritize(
        self,
        messages: List[str],
        include_details: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Prioritize a list of messages.
        
        Args:
            messages: List of message texts
            include_details: Whether to include scoring details
            
        Returns:
            List of prioritized message dictionaries, sorted by priority
        """
        prioritized = []
        
        for message in messages:
            result = self._score_message(message)
            prioritized.append(result)
        
        # Sort by priority score (descending)
        prioritized.sort(key=lambda x: x["priority_score"], reverse=True)
        
        if not include_details:
            return [
                {"content": p["content"], "priority_score": p["priority_score"]}
                for p in prioritized
            ]
        
        return prioritized
    
    def _score_message(self, message: str) -> Dict[str, Any]:
        """
        Calculate priority score for a single message.
        
        Args:
            message: Message text
            
        Returns:
            Dictionary with message, score, and scoring breakdown
        """
        message_lower = message.lower()
        
        # 1. Intent-based score
        intent = "casual"
        intent_confidence = 0.0
        if self.intent_parser:
            intent_result = self.intent_parser.classify(message)
            intent = intent_result["intent"]
            intent_confidence = intent_result["confidence"]
        
        intent_score = self.INTENT_WEIGHTS.get(intent, 1.0) * (0.5 + intent_confidence)
        
        # 2. Keyword-based urgency score
        urgency_keywords_found = []
        keyword_score = 0.0
        
        for keyword, weight in self.URGENCY_KEYWORDS.items():
            if keyword in message_lower:
                keyword_score += weight
                urgency_keywords_found.append(keyword)
        
        # 3. Pattern-based score
        pattern_score = self._calculate_pattern_score(message)
        
        # 4. Length/complexity bonus (longer messages might need attention)
        length_score = min(len(message) / 200, 1.0) * 0.5
        
        # 5. Question indicator
        question_score = 1.0 if "?" in message else 0.0
        
        # Calculate total priority score
        total_score = (
            intent_score * 2.0 +
            keyword_score +
            pattern_score +
            length_score +
            question_score
        )
        
        # Normalize to 0-10 scale
        normalized_score = min(total_score, 10.0)
        
        return {
            "content": message,
            "priority_score": round(normalized_score, 2),
            "intent": intent,
            "intent_confidence": round(intent_confidence, 2),
            "urgency_keywords": urgency_keywords_found,
            "breakdown": {
                "intent_score": round(intent_score, 2),
                "keyword_score": round(keyword_score, 2),
                "pattern_score": round(pattern_score, 2),
                "length_score": round(length_score, 2),
                "question_score": question_score
            }
        }
    
    def _calculate_pattern_score(self, message: str) -> float:
        """Calculate score based on pattern matching."""
        score = 0.0
        
        # Multiple exclamation marks
        if re.search(r'!{2,}', message):
            score += 1.0
        
        # ALL CAPS (shouting)
        caps_ratio = sum(1 for c in message if c.isupper()) / max(len(message), 1)
        if caps_ratio > 0.3 and len(message) > 10:
            score += 1.5
        
        # Time-sensitive patterns
        time_patterns = [
            r'\btoday\b',
            r'\bnow\b',
            r'\bimmediately\b',
            r'\bas soon as\b',
            r'\bby\s+\d',  # "by 5PM", "by tomorrow"
            r'\bdeadline\b',
            r'\bdue\b'
        ]
        for pattern in time_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                score += 0.5
        
        # Negative sentiment patterns
        negative_patterns = [
            r"\bcan'?t\b",
            r"\bwon'?t\b",
            r"\bdoesn'?t\b",
            r'\bnot working\b',
            r'\bfailed\b',
            r'\berror\b',
            r'\bbroken\b',
            r'\bissue\b',
            r'\bproblem\b'
        ]
        for pattern in negative_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                score += 0.3
        
        return score
    
    def get_priority_distribution(
        self,
        messages: List[str]
    ) -> Dict[str, int]:
        """
        Get distribution of messages by priority level.
        
        Args:
            messages: List of message texts
            
        Returns:
            Dictionary of priority_level -> count
        """
        prioritized = self.prioritize(messages, include_details=False)
        
        distribution = {
            "high": 0,    # score >= 6
            "medium": 0,  # score >= 3
            "low": 0      # score < 3
        }
        
        for msg in prioritized:
            score = msg["priority_score"]
            if score >= 6:
                distribution["high"] += 1
            elif score >= 3:
                distribution["medium"] += 1
            else:
                distribution["low"] += 1
        
        return distribution
    
    def get_top_priority(
        self,
        messages: List[str],
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get the top N priority messages.
        
        Args:
            messages: List of message texts
            top_n: Number of top messages to return
            
        Returns:
            List of top prioritized messages
        """
        prioritized = self.prioritize(messages)
        return prioritized[:top_n]
