"""
Intent Parser Service
=====================
Message intent classification using NLP.
"""

from typing import Dict, List, Any
import re
import structlog

logger = structlog.get_logger()


class IntentParserService:
    """Service for classifying message intent."""
    
    # Intent labels and keywords
    INTENTS = {
        "urgent": {
            "keywords": [
                "urgent", "asap", "immediately", "emergency", "critical",
                "help", "crisis", "now", "hurry", "quick", "fast",
                "important", "priority", "deadline", "rush"
            ],
            "patterns": [
                r"\basap\b", r"\burgent\b", r"!!!+", r"\bhelp\b",
                r"need.*now", r"right away", r"as soon as possible"
            ],
            "weight": 1.5
        },
        "support": {
            "keywords": [
                "help", "issue", "problem", "error", "broken", "fix",
                "not working", "trouble", "stuck", "confused", "question",
                "how do i", "can't", "unable", "support", "assist"
            ],
            "patterns": [
                r"how (do|can|to) (i|we)", r"(doesn't|don't|can't) work",
                r"having (trouble|issues|problems)", r"\?$"
            ],
            "weight": 1.0
        },
        "sales": {
            "keywords": [
                "buy", "purchase", "price", "cost", "discount", "offer",
                "deal", "plan", "subscription", "upgrade", "premium",
                "quote", "pricing", "interested", "demo", "trial"
            ],
            "patterns": [
                r"how much", r"what('s| is) the price", r"interested in",
                r"want to (buy|purchase)", r"looking for.*plan"
            ],
            "weight": 1.2
        },
        "casual": {
            "keywords": [
                "hi", "hello", "hey", "thanks", "thank you", "bye",
                "good", "great", "nice", "cool", "okay", "ok",
                "sure", "yes", "no", "maybe"
            ],
            "patterns": [
                r"^(hi|hey|hello)\b", r"^(thanks|thank you)",
                r"^(ok|okay|sure)\b", r"^(bye|goodbye)"
            ],
            "weight": 0.5
        }
    }
    
    def __init__(self):
        """Initialize the intent parser."""
        self.nlp = None
        self._ready = False
        self._load_nlp()
    
    def _load_nlp(self):
        """Load spaCy NLP model."""
        try:
            import spacy
            self.nlp = spacy.load("en_core_web_sm")
            self._ready = True
            logger.info("spaCy model loaded successfully")
        except Exception as e:
            logger.warning("Failed to load spaCy model, using keyword-only", error=str(e))
            self.nlp = None
            self._ready = True  # Still ready with keyword matching
    
    def is_ready(self) -> bool:
        """Check if the service is ready."""
        return self._ready
    
    def classify(self, message: str) -> Dict[str, Any]:
        """
        Classify the intent of a message.
        
        Args:
            message: The message text to classify
            
        Returns:
            Dictionary with intent, confidence, and all scores
        """
        if not message:
            return {
                "intent": "casual",
                "confidence": 0.0,
                "scores": {}
            }
        
        message_lower = message.lower()
        scores = {}
        
        # Calculate scores for each intent
        for intent, config in self.INTENTS.items():
            score = self._calculate_intent_score(
                message_lower,
                config["keywords"],
                config["patterns"],
                config["weight"]
            )
            scores[intent] = score
        
        # Apply NLP-based boost if available
        if self.nlp:
            scores = self._apply_nlp_boost(message, scores)
        
        # Normalize scores
        total = sum(scores.values()) or 1
        normalized_scores = {k: v / total for k, v in scores.items()}
        
        # Get the highest scoring intent
        best_intent = max(normalized_scores, key=normalized_scores.get)
        confidence = normalized_scores[best_intent]
        
        return {
            "intent": best_intent,
            "confidence": round(confidence, 3),
            "scores": {k: round(v, 3) for k, v in normalized_scores.items()}
        }
    
    def _calculate_intent_score(
        self,
        message: str,
        keywords: List[str],
        patterns: List[str],
        weight: float
    ) -> float:
        """Calculate intent score based on keywords and patterns."""
        score = 0.0
        
        # Keyword matching
        for keyword in keywords:
            if keyword in message:
                score += 1.0
        
        # Pattern matching
        for pattern in patterns:
            if re.search(pattern, message, re.IGNORECASE):
                score += 2.0
        
        return score * weight
    
    def _apply_nlp_boost(
        self,
        message: str,
        scores: Dict[str, float]
    ) -> Dict[str, float]:
        """Apply NLP-based analysis to boost scores."""
        if not self.nlp:
            return scores
        
        try:
            doc = self.nlp(message)
            
            # Check for question sentences
            if message.strip().endswith("?"):
                scores["support"] = scores.get("support", 0) + 1.5
            
            # Check for imperative mood (commands)
            for token in doc:
                if token.dep_ == "ROOT" and token.pos_ == "VERB":
                    if token.text.lower() in ["help", "fix", "solve", "assist"]:
                        scores["support"] = scores.get("support", 0) + 1.0
                    elif token.text.lower() in ["buy", "get", "order", "subscribe"]:
                        scores["sales"] = scores.get("sales", 0) + 1.0
            
            # Check for named entities that might indicate business context
            for ent in doc.ents:
                if ent.label_ in ["MONEY", "PERCENT"]:
                    scores["sales"] = scores.get("sales", 0) + 1.0
                elif ent.label_ in ["TIME", "DATE"]:
                    # Could indicate urgency
                    scores["urgent"] = scores.get("urgent", 0) + 0.5
            
            # Sentiment-based adjustments (using simple heuristics)
            negative_words = ["not", "can't", "won't", "error", "fail", "broken"]
            for token in doc:
                if token.text.lower() in negative_words:
                    scores["support"] = scores.get("support", 0) + 0.5
            
        except Exception as e:
            logger.warning("NLP analysis failed", error=str(e))
        
        return scores
    
    def batch_classify(self, messages: List[str]) -> List[Dict[str, Any]]:
        """
        Classify multiple messages.
        
        Args:
            messages: List of message texts
            
        Returns:
            List of classification results
        """
        return [self.classify(msg) for msg in messages]
    
    def get_intent_distribution(
        self,
        messages: List[str]
    ) -> Dict[str, int]:
        """
        Get distribution of intents across messages.
        
        Args:
            messages: List of message texts
            
        Returns:
            Dictionary of intent -> count
        """
        distribution = {intent: 0 for intent in self.INTENTS}
        
        for msg in messages:
            result = self.classify(msg)
            intent = result["intent"]
            distribution[intent] = distribution.get(intent, 0) + 1
        
        return distribution
