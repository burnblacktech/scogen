-- Migration: Add Progressive Documentation System Support
-- Adds support for 5-level progressive documentation with scope locking

-- Add columns to projects table for scope locking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS locked_scope TEXT; -- JSON locked scope
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_checksum TEXT; -- SHA256 checksum for integrity
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_locked_at DATETIME; -- When scope was locked
ALTER TABLE projects ADD COLUMN IF NOT EXISTS generated_levels TEXT; -- JSON array of generated levels [1,2,3,4,5]

-- Create document_levels table to store generated level documents
CREATE TABLE IF NOT EXISTS document_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    level INTEGER NOT NULL,
    content TEXT NOT NULL, -- Rendered markdown content
    cross_references TEXT, -- JSON cross-references
    metadata TEXT, -- JSON metadata (pages, generated_at, etc.)
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects (id),
    UNIQUE(project_id, level)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_levels_project ON document_levels(project_id);
CREATE INDEX IF NOT EXISTS idx_document_levels_level ON document_levels(level);

