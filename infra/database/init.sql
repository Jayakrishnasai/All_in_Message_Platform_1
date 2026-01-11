-- ============================================================================
-- Messaging Intelligence Platform - Database Schema
-- ============================================================================
-- Database: PostgreSQL 15+ (Supabase)
-- Purpose: Matrix Synapse + AI Service tables
-- Note: Matrix Synapse creates ~50 tables automatically on first run
--       This script adds custom tables for AI service data
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For pgvector (semantic search)

-- ============================================================================
-- Custom AI Service Tables
-- ============================================================================

-- Table: ai_message_cache
-- Purpose: Cache AI analysis results to avoid re-processing
CREATE TABLE IF NOT EXISTS ai_message_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT NOT NULL UNIQUE,
    room_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    intent VARCHAR(50),
    priority_score DECIMAL(3,1),
    urgency_keywords TEXT[],
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table: ai_embeddings
-- Purpose: Store vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS ai_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT NOT NULL UNIQUE,
    room_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),  -- MiniLM model dimension
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS ai_embeddings_vector_idx 
ON ai_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Table: ai_knowledge_base
-- Purpose: Store extracted Q&A pairs
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_room TEXT NOT NULL,
    source_message_id TEXT,
    confidence DECIMAL(3,2),
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: ai_daily_reports
-- Purpose: Store generated daily/weekly reports
CREATE TABLE IF NOT EXISTS ai_daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE NOT NULL,
    report_type VARCHAR(20) NOT NULL, -- 'daily' or 'weekly'
    total_messages INT,
    high_priority_count INT,
    room_summaries JSONB,
    top_intents JSONB,
    generated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(report_date, report_type)
);

-- Table: ai_intent_stats
-- Purpose: Track intent distribution over time
CREATE TABLE IF NOT EXISTS ai_intent_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    room_id TEXT NOT NULL,
    intent VARCHAR(50) NOT NULL,
    message_count INT DEFAULT 0,
    avg_priority DECIMAL(3,1),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, room_id, intent)
);

-- Table: ai_processing_queue
-- Purpose: Queue for async AI processing
CREATE TABLE IF NOT EXISTS ai_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- 'summarize', 'classify', 'embed', etc.
    priority INT DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Indexes for ai_message_cache
CREATE INDEX IF NOT EXISTS idx_room_id ON ai_message_cache(room_id);
CREATE INDEX IF NOT EXISTS idx_intent ON ai_message_cache(intent);
CREATE INDEX IF NOT EXISTS idx_priority ON ai_message_cache(priority_score DESC);

-- Indexes for ai_embeddings
CREATE INDEX IF NOT EXISTS idx_room_embeddings ON ai_embeddings(room_id);

-- Indexes for ai_knowledge_base
CREATE INDEX IF NOT EXISTS idx_knowledge_room ON ai_knowledge_base(source_room);
CREATE INDEX IF NOT EXISTS idx_knowledge_verified ON ai_knowledge_base(is_verified);

-- Indexes for ai_daily_reports
CREATE INDEX IF NOT EXISTS idx_report_date ON ai_daily_reports(report_date DESC);

-- Indexes for ai_intent_stats
CREATE INDEX IF NOT EXISTS idx_intent_date ON ai_intent_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_intent_room ON ai_intent_stats(room_id);

-- Indexes for ai_processing_queue
CREATE INDEX IF NOT EXISTS idx_queue_status ON ai_processing_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_queue_created ON ai_processing_queue(created_at);


-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at for knowledge base
DROP TRIGGER IF EXISTS update_ai_knowledge_base_updated_at ON ai_knowledge_base;
CREATE TRIGGER update_ai_knowledge_base_updated_at
    BEFORE UPDATE ON ai_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- View: Recent high-priority messages
CREATE OR REPLACE VIEW v_high_priority_messages AS
SELECT 
    message_id,
    room_id,
    sender,
    content,
    intent,
    priority_score,
    urgency_keywords,
    processed_at
FROM ai_message_cache
WHERE priority_score >= 7.0
ORDER BY priority_score DESC, processed_at DESC
LIMIT 100;

-- View: Intent distribution summary
CREATE OR REPLACE VIEW v_intent_summary AS
SELECT 
    intent,
    COUNT(*) as message_count,
    AVG(priority_score) as avg_priority,
    COUNT(DISTINCT room_id) as room_count
FROM ai_message_cache
WHERE processed_at >= NOW() - INTERVAL '7 days'
GROUP BY intent
ORDER BY message_count DESC;

-- View: Top knowledge base entries
CREATE OR REPLACE VIEW v_top_knowledge AS
SELECT 
    id,
    question,
    answer,
    source_room,
    confidence,
    (upvotes - downvotes) as score,
    is_verified
FROM ai_knowledge_base
WHERE is_verified = TRUE OR (upvotes - downvotes) >= 5
ORDER BY (upvotes - downvotes) DESC, confidence DESC
LIMIT 50;

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Insert sample knowledge entries (comment out for production)
/*
INSERT INTO ai_knowledge_base (question, answer, source_room, confidence, is_verified) VALUES
    ('How do I track my order?', 
     'You can track your order by visiting the Orders section in your account. Each order has a tracking link.', 
     'support', 0.95, TRUE),
    ('What are the business hours?', 
     'Our support is available Monday-Friday, 9 AM to 6 PM EST. Emergency support is 24/7.', 
     'support', 0.92, TRUE),
    ('How do I request a refund?', 
     'To request a refund, go to your order history, select the order, and click Request Refund within 30 days.', 
     'support', 0.97, TRUE);
*/

-- ============================================================================
-- Maintenance Queries
-- ============================================================================

-- Clean up old processed queue items (run periodically)
-- DELETE FROM ai_processing_queue WHERE status = 'completed' AND processed_at < NOW() - INTERVAL '30 days';

-- Clean up old message cache (run periodically)
-- DELETE FROM ai_message_cache WHERE processed_at < NOW() - INTERVAL '90 days';

-- Vacuum and analyze tables (run periodically)
-- VACUUM ANALYZE ai_message_cache;
-- VACUUM ANALYZE ai_embeddings;
-- VACUUM ANALYZE ai_knowledge_base;

-- ============================================================================
-- Grants (adjust based on your user setup)
-- ============================================================================

-- Grant permissions to application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- ============================================================================
-- Matrix Synapse Tables (Auto-created)
-- ============================================================================
-- Note: The following tables are created automatically by Matrix Synapse
-- This is just documentation of what will exist:
--
-- Core tables:
-- - users, user_filters, user_threepids
-- - rooms, room_memberships, room_aliases
-- - events, event_json, state_events
-- - current_state_events, event_edges
-- - room_stats_state, room_stats_current
-- - devices, device_keys, device_lists_stream
-- - access_tokens, refresh_tokens
-- - presence, presence_stream
-- - receipts, receipts_linearized
-- - push_rules, push_rules_enable
-- - profiles, avatars
-- - media_repository, local_media_repository
-- - redactions, event_search
-- - etc. (~50 tables total)
--
-- Mautrix-Instagram tables (Auto-created):
-- - portal (Instagram chat -> Matrix room mappings)
-- - puppet (Instagram user -> Matrix user mappings)
-- - user (Matrix user -> Instagram account mappings)
-- - message (Message delivery tracking)
-- - reaction (Reaction tracking)
-- ============================================================================

COMMIT;

-- Schema creation complete!
-- Next steps:
-- 1. Run this script on your Supabase database
-- 2. Deploy Matrix Synapse (it will create its tables automatically)
-- 3. Deploy Mautrix-Instagram bridge (it will create its tables automatically)
-- 4. Start the AI service (it will use these custom tables)
