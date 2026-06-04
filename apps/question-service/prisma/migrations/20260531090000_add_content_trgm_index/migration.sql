-- ASR-PERF-11: Enable pg_trgm extension for trigram-based ILIKE full-text search.
-- Required before creating GIN index with gin_trgm_ops operator class on content field.
-- This extension is bundled with PostgreSQL contrib and safe to enable.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ASR-PERF-11: GIN trigram index on question content for fast ILIKE keyword search.
-- Replaces inefficient full-table scan (WHERE content ILIKE '%keyword%') with
-- index-driven trigram similarity lookup. Keeps query response ≤ 500ms at 5,000+
-- questions without changing any application-level query code (Prisma's
-- `contains: { mode: 'insensitive' }` automatically uses this index).
CREATE INDEX "idx_questions_content_trgm" ON "questions" USING GIN ("content" gin_trgm_ops);
