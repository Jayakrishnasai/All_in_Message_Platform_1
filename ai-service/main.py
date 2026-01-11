"""
AI Backend Service - Main Application
=====================================
FastAPI application providing AI/NLP capabilities for the Messaging Intelligence Platform.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import structlog

from services import (
    MatrixClient,
    SummarizerService,
    IntentParserService,
    PrioritizerService,
    EmbeddingService,
    VectorStoreService,
    DailyReportService,
    KnowledgeBaseService
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# ===========================================
# Service Instances (Lazy Loading)
# ===========================================
matrix_client: Optional[MatrixClient] = None
summarizer: Optional[SummarizerService] = None
intent_parser: Optional[IntentParserService] = None
prioritizer: Optional[PrioritizerService] = None
embedding_service: Optional[EmbeddingService] = None
vector_store: Optional[VectorStoreService] = None
daily_report_service: Optional[DailyReportService] = None
knowledge_base: Optional[KnowledgeBaseService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    global matrix_client, summarizer, intent_parser, prioritizer
    global embedding_service, vector_store, daily_report_service, knowledge_base
    
    logger.info("Starting AI Backend Service...")
    
    # Initialize services
    matrix_client = MatrixClient(
        homeserver_url=os.getenv("MATRIX_HOMESERVER_URL", "http://synapse:8008"),
        access_token=os.getenv("MATRIX_ACCESS_TOKEN", "")
    )
    
    summarizer = SummarizerService()
    intent_parser = IntentParserService()
    prioritizer = PrioritizerService(intent_parser)
    embedding_service = EmbeddingService()
    vector_store = VectorStoreService(embedding_service)
    daily_report_service = DailyReportService(matrix_client, summarizer)
    knowledge_base = KnowledgeBaseService(vector_store)
    
    logger.info("All services initialized successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down AI Backend Service...")
    if vector_store:
        vector_store.save()


# ===========================================
# FastAPI Application
# ===========================================
app = FastAPI(
    title="Messaging Intelligence Platform - AI Backend",
    description="AI/NLP services for message analysis, summarization, and insights",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================
# Request/Response Models
# ===========================================

class Message(BaseModel):
    """Single message model."""
    id: str
    sender: str
    content: str
    timestamp: datetime
    room_id: Optional[str] = None


class MessageList(BaseModel):
    """List of messages for batch processing."""
    messages: List[str] = Field(..., min_length=1)
    room_id: Optional[str] = None


class SummarizeRequest(BaseModel):
    """Request for summarization."""
    messages: List[str] = Field(..., min_length=1)
    max_length: int = Field(default=150, ge=50, le=500)


class SummarizeResponse(BaseModel):
    """Summarization response."""
    summary: str
    message_count: int
    processing_time_ms: float


class IntentRequest(BaseModel):
    """Request for intent classification."""
    message: str = Field(..., min_length=1)


class IntentResponse(BaseModel):
    """Intent classification response."""
    intent: str
    confidence: float
    all_scores: dict


class PriorityMessage(BaseModel):
    """Prioritized message model."""
    content: str
    priority_score: float
    intent: str
    urgency_keywords: List[str]
    room_id: Optional[str] = None


class PriorityResponse(BaseModel):
    """Priority inbox response."""
    messages: List[PriorityMessage]
    total_processed: int


class SearchRequest(BaseModel):
    """Vector search request."""
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=100)


class SearchResult(BaseModel):
    """Single search result."""
    content: str
    score: float
    metadata: dict


class SearchResponse(BaseModel):
    """Vector search response."""
    results: List[SearchResult]
    query: str


class DailyReportResponse(BaseModel):
    """Daily report response."""
    date: str
    room_summaries: dict
    total_messages: int
    top_intents: dict
    high_priority_count: int


class KnowledgeEntry(BaseModel):
    """Knowledge base entry."""
    question: str
    answer: str
    source_room: str
    confidence: float


class KnowledgeResponse(BaseModel):
    """Knowledge base response."""
    entries: List[KnowledgeEntry]
    total_entries: int


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    services: dict
    timestamp: datetime


# ===========================================
# API Endpoints
# ===========================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    services_status = {
        "matrix_client": matrix_client is not None,
        "summarizer": summarizer is not None and summarizer.is_ready(),
        "intent_parser": intent_parser is not None and intent_parser.is_ready(),
        "vector_store": vector_store is not None,
    }
    
    return HealthResponse(
        status="healthy" if all(services_status.values()) else "degraded",
        version="1.0.0",
        services=services_status,
        timestamp=datetime.utcnow()
    )


@app.get("/api/messages/{room_id}")
async def get_messages(
    room_id: str,
    limit: int = 100,
    from_token: Optional[str] = None
):
    """Fetch messages from a Matrix room."""
    if not matrix_client:
        raise HTTPException(status_code=503, detail="Matrix client not initialized")
    
    try:
        messages = await matrix_client.get_room_messages(
            room_id=room_id,
            limit=limit,
            from_token=from_token
        )
        return {"room_id": room_id, "messages": messages, "count": len(messages)}
    except Exception as e:
        logger.error("Failed to fetch messages", room_id=room_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_messages(request: SummarizeRequest):
    """Generate summary of messages."""
    if not summarizer:
        raise HTTPException(status_code=503, detail="Summarizer not initialized")
    
    import time
    start_time = time.time()
    
    try:
        summary = summarizer.summarize(
            messages=request.messages,
            max_length=request.max_length
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return SummarizeResponse(
            summary=summary,
            message_count=len(request.messages),
            processing_time_ms=round(processing_time, 2)
        )
    except Exception as e:
        logger.error("Summarization failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/intent", response_model=IntentResponse)
async def classify_intent(request: IntentRequest):
    """Classify message intent."""
    if not intent_parser:
        raise HTTPException(status_code=503, detail="Intent parser not initialized")
    
    try:
        result = intent_parser.classify(request.message)
        return IntentResponse(
            intent=result["intent"],
            confidence=result["confidence"],
            all_scores=result["scores"]
        )
    except Exception as e:
        logger.error("Intent classification failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/priority", response_model=PriorityResponse)
async def get_priority_messages(request: MessageList):
    """Get prioritized messages."""
    if not prioritizer:
        raise HTTPException(status_code=503, detail="Prioritizer not initialized")
    
    try:
        prioritized = prioritizer.prioritize(request.messages)
        
        priority_messages = [
            PriorityMessage(
                content=msg["content"],
                priority_score=msg["priority_score"],
                intent=msg["intent"],
                urgency_keywords=msg["urgency_keywords"],
                room_id=request.room_id
            )
            for msg in prioritized
        ]
        
        return PriorityResponse(
            messages=priority_messages,
            total_processed=len(request.messages)
        )
    except Exception as e:
        logger.error("Prioritization failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/embed")
async def embed_messages(request: MessageList, background_tasks: BackgroundTasks):
    """Embed messages into vector store."""
    if not vector_store:
        raise HTTPException(status_code=503, detail="Vector store not initialized")
    
    try:
        # Add to vector store in background
        background_tasks.add_task(
            vector_store.add_messages,
            request.messages,
            {"room_id": request.room_id}
        )
        
        return {"status": "processing", "message_count": len(request.messages)}
    except Exception as e:
        logger.error("Embedding failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    """Perform semantic search over stored messages."""
    if not vector_store:
        raise HTTPException(status_code=503, detail="Vector store not initialized")
    
    try:
        results = vector_store.search(request.query, top_k=request.top_k)
        
        search_results = [
            SearchResult(
                content=r["content"],
                score=r["score"],
                metadata=r.get("metadata", {})
            )
            for r in results
        ]
        
        return SearchResponse(results=search_results, query=request.query)
    except Exception as e:
        logger.error("Search failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/daily", response_model=DailyReportResponse)
async def get_daily_report(date: Optional[str] = None):
    """Get daily report for a specific date."""
    if not daily_report_service:
        raise HTTPException(status_code=503, detail="Report service not initialized")
    
    try:
        target_date = date or datetime.utcnow().strftime("%Y-%m-%d")
        report = await daily_report_service.generate_report(target_date)
        
        return DailyReportResponse(
            date=target_date,
            room_summaries=report["room_summaries"],
            total_messages=report["total_messages"],
            top_intents=report["top_intents"],
            high_priority_count=report["high_priority_count"]
        )
    except Exception as e:
        logger.error("Report generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge", response_model=KnowledgeResponse)
async def get_knowledge_base(
    room_id: Optional[str] = None,
    limit: int = 50
):
    """Get knowledge base entries."""
    if not knowledge_base:
        raise HTTPException(status_code=503, detail="Knowledge base not initialized")
    
    try:
        entries = knowledge_base.get_entries(room_id=room_id, limit=limit)
        
        knowledge_entries = [
            KnowledgeEntry(
                question=e["question"],
                answer=e["answer"],
                source_room=e["source_room"],
                confidence=e["confidence"]
            )
            for e in entries
        ]
        
        return KnowledgeResponse(
            entries=knowledge_entries,
            total_entries=len(knowledge_entries)
        )
    except Exception as e:
        logger.error("Knowledge retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/knowledge/extract")
async def extract_knowledge(
    request: MessageList,
    background_tasks: BackgroundTasks
):
    """Extract Q&A pairs from messages."""
    if not knowledge_base:
        raise HTTPException(status_code=503, detail="Knowledge base not initialized")
    
    try:
        background_tasks.add_task(
            knowledge_base.extract_from_messages,
            request.messages,
            request.room_id
        )
        
        return {"status": "processing", "message_count": len(request.messages)}
    except Exception as e:
        logger.error("Knowledge extraction failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rooms")
async def get_rooms():
    """Get list of rooms the bot is a member of."""
    if not matrix_client:
        raise HTTPException(status_code=503, detail="Matrix client not initialized")
    
    try:
        rooms = await matrix_client.get_joined_rooms()
        return {"rooms": rooms}
    except Exception as e:
        logger.error("Failed to fetch rooms", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
