# Messaging Intelligence Platform (All-in-One Message Platform)

A central messaging hub that pulls chats from Instagram into Matrix, stores them, shows them in a web UI, and runs AI analysis on top of them.

![Platform Overview](docs/architecture.png)

## Features

- **Unified Messaging**: Aggregate Instagram DMs into Matrix
- **AI Summarization**: Generate conversation summaries using BART
- **Intent Classification**: Categorize messages as Urgent, Support, Sales, or Casual
- **Priority Inbox**: Automatically prioritize messages needing attention
- **Knowledge Base**: Extract Q&A pairs from conversations
- **Vector Search**: Semantic search across all messages
- **Daily Reports**: Automated insights and analytics

## Architecture

```
Instagram → Mautrix Bridge → Matrix Synapse → Supabase PostgreSQL
                                    ↓
                            AI Backend (FastAPI)
                                    ↓
                            Next.js Frontend
```

## Walkthrough

### Data Flow
1. **Instagram DM** → Mautrix Bridge receives message
2. **Bridge** → Converts to Matrix event, injects into Synapse
3. **Matrix Synapse** → Stores in Supabase PostgreSQL
4. **AI Backend** → Fetches messages via Matrix APIs
5. **NLP Pipeline** → Summarization, Intent, Priority, Embeddings
6. **Frontend** → Displays messages + AI insights

### AI Features
| Feature | Model/Tech | Output |
|---------|------------|--------|
| Summarization | facebook/bart-large-cnn | Conversation summary |
| Intent | spaCy + Keywords | Urgent/Support/Sales/Casual |
| Priority | Multi-factor scoring | 0-10 priority score |
| Search | FAISS + MiniLM | Semantic search results |
| Knowledge | Q&A Extraction | FAQ entries |

### Frontend Pages
| Page | Purpose |
|------|---------|
| `/` | Matrix login |
| `/dashboard` | Stats, rooms, intent chart |
| `/rooms/[id]` | Chat view + AI summary |
| `/priority` | Messages ranked by urgency |
| `/insights` | Daily reports & analytics |
| `/knowledge` | Searchable Q&A base |

### Services (Docker)
- **synapse** - Matrix homeserver (port 8008)
- **mautrix-instagram** - Instagram bridge
- **ai-service** - FastAPI backend (port 8000)
- **frontend** - Next.js (port 3000)
- **nginx** - Reverse proxy (ports 80/443)
- **redis** - Caching

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Azure VM (Ubuntu 22.04)
- DuckDNS domain
- Supabase account

### Deployment

```bash
# Clone the repository
git clone https://github.com/Jayakrishnasai/All_in_Message_Platform_1.git
cd message

# Configure environment
cp infra/.env.example infra/.env
# Edit infra/.env with your values

# Start all services
cd infra
docker-compose up -d

# Check status
docker-compose ps
```

### Create Admin User

```bash
docker exec -it matrix-synapse register_new_matrix_user \
  -u admin -p YourPassword -a \
  -c /data/homeserver.yaml http://localhost:8008
```

## Project Structure

```
message/
├── infra/                 # Docker & NGINX configs
│   ├── docker-compose.yml
│   ├── .env
│   └── nginx/
├── matrix/                # Matrix Synapse config
│   ├── homeserver.yaml
│   └── appservices/
├── bridge/                # Mautrix-Instagram
│   └── mautrix-instagram/
├── ai-service/            # FastAPI AI backend
│   ├── main.py
│   └── services/
├── frontend/              # Next.js UI
│   └── src/
└── docs/                  # Documentation
```

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Summarization
```bash
curl -X POST http://localhost:8000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"messages": ["Hello", "How can I help?"]}'
```

### Intent Classification
```bash
curl -X POST http://localhost:8000/api/intent \
  -H "Content-Type: application/json" \
  -d '{"message": "URGENT: Need help now!"}'
```

### Priority Scoring
```bash
curl -X POST http://localhost:8000/api/priority \
  -H "Content-Type: application/json" \
  -d '{"messages": ["Urgent issue!", "Just saying hi"]}'
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Messaging | Matrix Synapse |
| Bridge | Mautrix-Instagram |
| Database | PostgreSQL (Supabase) |
| AI Backend | FastAPI, Python 3.10 |
| NLP | Hugging Face Transformers, spaCy |
| Vector Store | FAISS |
| Frontend | Next.js 14, TypeScript |
| Proxy | NGINX |
| Container | Docker |

## Documentation

- [Architecture](docs/architecture.md)
- [Setup Guide](docs/setup.md)
- [Deployment Checklist](docs/deployment-checklist.md)
- [Testing Guide](docs/testing-guide.md)
- [Demo Script](docs/demo-script.md)

## Known Limitations

- Single Instagram account per bridge
- B1s VM may be resource-constrained for AI
- Instagram API rate limits apply
- Self-signed SSL (needs Let's Encrypt for production)

## Future Improvements

- [ ] LinkedIn bridge integration
- [ ] Fine-tuned intent classification model
- [ ] Real-time WebSocket updates
- [ ] Multi-tenant support
- [ ] Mobile app

## License

MIT

## Links

- **Demo**: [your-domain.duckdns.org](https://your-domain.duckdns.org)
- **Video**: [Loom Demo](#)
- **Documentation**: [docs/](docs/)
