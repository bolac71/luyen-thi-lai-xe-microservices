-- ASR-PERF-02: Enable pg_trgm extension for trigram-based ILIKE search indexes.
-- Required before creating GIN indexes with gin_trgm_ops operator class.
-- This extension is bundled with PostgreSQL contrib and safe to enable.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ASR-PERF-02: Three separate GIN trigram indexes on user search fields.
-- PostgreSQL's bitmap OR-scan combines these indexes automatically when the
-- query uses OR conditions (fullName ILIKE '%kw%' OR email ILIKE '%kw%' OR
-- phoneNumber ILIKE '%kw%'), satisfying the P95 ≤ 500ms constraint at 10k records.
CREATE INDEX "idx_user_profiles_fullname_trgm" ON "user_profiles" USING GIN ("fullName" gin_trgm_ops);
CREATE INDEX "idx_user_profiles_email_trgm" ON "user_profiles" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "idx_user_profiles_phone_trgm" ON "user_profiles" USING GIN ("phoneNumber" gin_trgm_ops);
