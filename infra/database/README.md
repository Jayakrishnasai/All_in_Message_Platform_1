# Database Setup Guide

## Overview

The Messaging Intelligence Platform uses **Supabase PostgreSQL** for data storage:
- **Matrix Synapse** tables (auto-created)
- **Mautrix-Instagram** tables (auto-created)
- **AI Service** custom tables (this script)

---

## Database Schema

### Auto-Created Tables

**Matrix Synapse** (~50 tables):
- User accounts, authentication
- Rooms, memberships, invitations
- Events, messages, state
- Media storage metadata
- Federation data
- Push rules, receipts

**Mautrix-Instagram Bridge** (~5 tables):
- Portal mappings (Instagram ↔ Matrix)
- Puppet users
- Message delivery tracking

### Custom AI Tables (Created by `init.sql`)

| Table | Purpose |
|-------|---------|
| `ai_message_cache` | Cached AI analysis results |
| `ai_embeddings` | Vector embeddings for semantic search |
| `ai_knowledge_base` | Extracted Q&A pairs |
| `ai_daily_reports` | Generated analytics reports |
| `ai_intent_stats` | Intent tracking over time |
| `ai_processing_queue` | Async task queue |

---

## Setup Instructions

### Method 1: Via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `nkdolzimfmyggokeukka`
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy contents of `init.sql`
6. Paste and click **Run**

### Method 2: Via psql Command Line

```bash
# From Windows PowerShell
psql "postgresql://postgres:DataBase@1233@db.nkdolzimfmyggokeukka.supabase.co:5432/postgres" -f init.sql
```

### Method 3: Via Python Script (Automated)

```bash
cd infra/database
python setup_database.py
```

---

## Verification

### Check Tables Created

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check custom AI tables
SELECT COUNT(*) FROM ai_message_cache;
SELECT COUNT(*) FROM ai_embeddings;
SELECT COUNT(*) FROM ai_knowledge_base;
```

### Check Extensions

```sql
-- Verify pgvector extension for semantic search
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Post-Deployment

### Matrix Synapse Auto-Creation

When you first start Matrix Synapse:
1. It connects to Supabase
2. Runs migrations automatically
3. Creates all required tables
4. You'll see logs: `Preparing database schema...`

### Mautrix Bridge Auto-Creation

When the Instagram bridge starts:
1. It creates bridge-specific tables
2. Stores portal mappings
3. Ready to sync messages

---

## Maintenance

### Cleanup Old Data

```sql
-- Remove old processed queue items (30+ days)
DELETE FROM ai_processing_queue 
WHERE status = 'completed' 
AND processed_at < NOW() - INTERVAL '30 days';

-- Remove old cached messages (90+ days)
DELETE FROM ai_message_cache 
WHERE processed_at < NOW() - INTERVAL '90 days';
```

### Optimize Performance

```sql
-- Vacuum and analyze
VACUUM ANALYZE ai_message_cache;
VACUUM ANALYZE ai_embeddings;
VACUUM ANALYZE ai_knowledge_base;

-- Reindex vector search
REINDEX INDEX ai_embeddings_vector_idx;
```

---

## Troubleshooting

### "Extension vector does not exist"

```sql
-- Install pgvector extension
CREATE EXTENSION vector;
```

### Connection Failed

Verify credentials:
```bash
# Test connection
psql "postgresql://postgres:DataBase@1233@db.nkdolzimfmyggokeukka.supabase.co:5432/postgres" -c "SELECT version();"
```

### Permission Errors

```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

---

## Schema Diagram

```
┌─────────────────────────────────────────────────┐
│              SUPABASE POSTGRESQL                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Matrix Synapse Tables (auto-created)          │
│  ┌─────────────────────────────────────────┐   │
│  │ • users, rooms, events                  │   │
│  │ • room_memberships, state_events        │   │
│  │ • devices, access_tokens                │   │
│  │ • media_repository, push_rules          │   │
│  │ • ~50 tables total                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Mautrix Bridge Tables (auto-created)          │
│  ┌─────────────────────────────────────────┐   │
│  │ • portal, puppet, user                  │   │
│  │ • message, reaction                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  AI Service Tables (init.sql)                  │
│  ┌─────────────────────────────────────────┐   │
│  │ • ai_message_cache                      │   │
│  │ • ai_embeddings (with vector index)     │   │
│  │ • ai_knowledge_base                     │   │
│  │ • ai_daily_reports                      │   │
│  │ • ai_intent_stats                       │   │
│  │ • ai_processing_queue                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Run `init.sql` on Supabase
2. ✅ Deploy Docker containers
3. ✅ Matrix Synapse auto-creates tables
4. ✅ Bridge auto-creates tables
5. ✅ AI service uses custom tables

Your database will be fully initialized and ready! 🚀
