-- Migration: Add engine_version to document_levels
-- Used for determinism verification

ALTER TABLE document_levels ADD COLUMN IF NOT EXISTS engine_version TEXT;

