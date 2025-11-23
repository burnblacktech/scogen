-- Migration 003: Add Lifecycle Management and Enhanced Authentication
-- Run with: npm run db:migrate

-- Project state logs table
CREATE TABLE IF NOT EXISTS project_state_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    from_state TEXT,
    to_state TEXT NOT NULL,
    changed_by TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_state_logs_project 
ON project_state_logs(project_id);

CREATE INDEX IF NOT EXISTS idx_project_state_logs_created 
ON project_state_logs(created_at);

-- Add user tracking columns to projects table
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE
-- These will be added programmatically in the migration runner if they don't exist
-- Columns to add: created_by, last_updated_by, company_name

-- User sessions table for token management (optional enhancement)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Ensure users table has required columns
-- Add role column if not exists (handled in code)
-- Add company_name column if not exists (handled in code)

-- Add indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(project_status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

