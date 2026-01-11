# Messaging Intelligence Platform - Architecture

## System Overview

The Messaging Intelligence Platform (MIP) is a comprehensive solution that centralizes social media messages from Instagram into a Matrix-based messaging backbone, applies AI/NLP analysis, and presents insights through a modern web interface.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           MESSAGING INTELLIGENCE PLATFORM                           │
│                                                                                     │
│  ┌──────────────┐     ┌──────────────────────────────────────────────────────────┐ │
│  │   Instagram  │     │                    Azure VM (Ubuntu 22.04)               │ │
│  │   Platform   │────►│  ┌────────────────────────────────────────────────────┐  │ │
│  └──────────────┘     │  │               Docker Container Network              │  │ │
│                       │  │                                                     │  │ │
│                       │  │  ┌───────────┐    ┌────────────┐    ┌───────────┐  │  │ │
│                       │  │  │  NGINX    │    │   Matrix   │    │    AI     │  │  │ │
│                       │  │  │  Reverse  │◄──►│   Synapse  │◄──►│  Backend  │  │  │ │
│                       │  │  │  Proxy    │    │   :8008    │    │  :8000    │  │  │ │
│                       │  │  │  :80/443  │    └─────┬──────┘    └─────┬─────┘  │  │ │
│                       │  │  └─────┬─────┘          │                 │        │  │ │
│                       │  │        │                │                 │        │  │ │
│                       │  │        │          ┌─────┴──────┐          │        │  │ │
│                       │  │        │          │  Mautrix   │          │        │  │ │
│                       │  │        │          │ Instagram  │◄─────────┘        │  │ │
│                       │  │        │          │  Bridge    │                   │  │ │
│                       │  │        │          └────────────┘                   │  │ │
│                       │  │        │                                           │  │ │
│                       │  │        └──────────────────────────────────────────►│  │ │
│                       │  │                                                    │  │ │
│                       │  │  ┌───────────┐    ┌────────────┐    ┌───────────┐ │  │ │
│                       │  │  │  Next.js  │    │   Redis    │    │  Supabase │ │  │ │
│                       │  │  │ Frontend  │    │   Cache    │    │ PostgreSQL│ │  │ │
│                       │  │  │  :3000    │    │   :6379    │    │  (Cloud)  │ │  │ │
│                       │  │  └───────────┘    └────────────┘    └───────────┘ │  │ │
│                       │  └─────────────────────────────────────────────────────┘ │  │
│                       └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Message Ingestion Flow

```
1. User sends message on Instagram
             │
             ▼
2. Mautrix-Instagram bridge receives via Meta API
             │
             ▼
3. Bridge converts to Matrix event format
             │
             ▼
4. Matrix Synapse receives and stores message
             │
             ▼
5. Message stored in Supabase PostgreSQL
             │
             ▼
6. AI Backend polls/syncs for new messages
             │
             ▼
7. NLP processing: summarization, intent, priority
             │
             ▼
8. Results stored and indexed in FAISS
             │
             ▼
9. Frontend displays messages and insights
```

### AI Processing Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                    AI PROCESSING PIPELINE                    │
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │   Message   │──►│   Intent    │──►│  Priority   │        │
│  │   Fetch     │   │   Parser    │   │   Scorer    │        │
│  └─────────────┘   └─────────────┘   └──────┬──────┘        │
│                                              │               │
│  ┌─────────────┐   ┌─────────────┐   ┌──────▼──────┐        │
│  │   Vector    │◄──│  Embedding  │◄──│ Summarizer  │        │
│  │   Store     │   │   Service   │   │   (BART)    │        │
│  └──────┬──────┘   └─────────────┘   └─────────────┘        │
│         │                                                    │
│  ┌──────▼──────┐   ┌─────────────┐   ┌─────────────┐        │
│  │   Search    │   │   Daily     │   │  Knowledge  │        │
│  │   Index     │   │   Reports   │   │    Base     │        │
│  └─────────────┘   └─────────────┘   └─────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. NGINX Reverse Proxy

**Purpose**: Entry point for all HTTP/HTTPS traffic

**Routes**:
- `/_matrix/*` → Matrix Synapse
- `/_synapse/*` → Matrix Synapse Admin
- `/api/*` → AI Backend
- `/*` → Next.js Frontend

**Features**:
- TLS termination
- Rate limiting
- WebSocket support
- Static file caching

### 2. Matrix Synapse

**Purpose**: Core messaging infrastructure

**Key Features**:
- Event storage and distribution
- User authentication
- Room management
- Federation support (optional)
- Appservice integration

**Database**: Supabase PostgreSQL

### 3. Mautrix-Instagram Bridge

**Purpose**: Connect Instagram DMs to Matrix

**How it works**:
1. User logs into Instagram via bridge bot
2. Bridge maintains session with Instagram
3. New DMs are converted to Matrix messages
4. Messages appear in dedicated Matrix rooms

**Limitations**:
- Requires active Instagram session
- Subject to Meta's API rate limits
- May require periodic re-authentication

### 4. AI Backend (FastAPI)

**Purpose**: NLP and AI analysis

**Services**:

| Service | Model/Tech | Description |
|---------|------------|-------------|
| Summarizer | facebook/bart-large-cnn | Conversation summarization |
| Intent Parser | spaCy + Keywords | Classify: Urgent, Support, Sales, Casual |
| Prioritizer | Multi-factor scoring | Rank messages by importance |
| Embeddings | all-MiniLM-L6-v2 | Semantic text representations |
| Vector Store | FAISS | Fast similarity search |
| Reports | Batch processing | Daily/weekly summaries |
| Knowledge Base | Q&A extraction | Build FAQ from conversations |

### 5. Next.js Frontend

**Purpose**: User interface

**Pages**:
- `/` - Login (Matrix authentication)
- `/dashboard` - Overview and stats
- `/rooms/[id]` - Chat view with AI features
- `/priority` - Priority inbox
- `/insights` - AI reports and analysis
- `/knowledge` - Searchable knowledge base

**Data Sources**:
- Matrix APIs (messages, rooms)
- AI Backend APIs (insights)

### 6. Redis Cache

**Purpose**: Performance optimization

**Usage**:
- Session caching
- Rate limiting counters
- Temporary data storage

### 7. Supabase PostgreSQL

**Purpose**: Persistent data storage

**Databases**:
- Matrix Synapse tables
- Mautrix bridge tables
- (Future) Custom application data

---

## Security Architecture

```
┌─────────────────────────────────────────────────┐
│                 SECURITY LAYERS                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Layer 1: Network Security                 │  │
│  │ • Azure NSG (firewall rules)              │  │
│  │ • Open ports: 22, 80, 443, 8448           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Layer 2: Transport Security               │  │
│  │ • TLS 1.2/1.3 encryption                  │  │
│  │ • Let's Encrypt certificates              │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Layer 3: Application Security             │  │
│  │ • Matrix authentication                   │  │
│  │ • Access token validation                 │  │
│  │ • Rate limiting                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Layer 4: Data Security                    │  │
│  │ • Environment variables for secrets       │  │
│  │ • Encrypted database connections          │  │
│  │ • Optional E2E encryption (Matrix)        │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Scalability Considerations

### Current Architecture (Single VM)

Suitable for:
- Development and testing
- Small deployments (< 100 users)
- Proof of concept

### Production Scaling

For larger deployments:

1. **Horizontal Scaling**
   - Multiple Synapse workers
   - Load-balanced frontends
   - Distributed Redis cluster

2. **Database Scaling**
   - Supabase handles scaling
   - Read replicas for analytics

3. **AI Service Scaling**
   - Queue-based processing
   - Multiple worker instances
   - GPU instances for inference

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Infrastructure | Azure VM | B1s |
| OS | Ubuntu | 22.04 LTS |
| Container | Docker | Latest |
| Orchestration | Docker Compose | 3.8 |
| Messaging | Matrix Synapse | Latest |
| Bridge | Mautrix-Instagram | Latest |
| Database | PostgreSQL (Supabase) | 15 |
| Cache | Redis | 7 |
| AI Framework | FastAPI | 0.109 |
| NLP | Hugging Face Transformers | 4.36 |
| NLP | spaCy | 3.7 |
| Vector DB | FAISS | 1.7 |
| Frontend | Next.js | 14.1 |
| Language | Python | 3.10 |
| Language | TypeScript | 5.3 |
