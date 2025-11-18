-- Migration: Add Stale Levels Tracking
-- Tracks which levels need regeneration after scope changes

ALTER TABLE projects ADD COLUMN IF NOT EXISTS stale_levels TEXT; -- JSON array of stale level numbers

