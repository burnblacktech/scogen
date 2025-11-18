-- Migration: Add Content Hash to document_levels
-- Used for determinism verification and caching

ALTER TABLE document_levels ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create index for hash lookups
CREATE INDEX IF NOT EXISTS idx_doc_levels_hash ON document_levels(content_hash);

