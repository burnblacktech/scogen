-- Add user management to existing schema
-- This migration adds user tables and extends projects table with user tracking

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'tester',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add user tracking columns to projects table
-- Note: SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS directly
-- We'll use a workaround by checking if column exists first
-- For simplicity, we'll just try to add and ignore errors if column exists

-- Add user_id to projects (if not exists)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we'll add it and handle errors gracefully in application code
-- Or use a migration check in application code

-- For now, we'll create a separate migration check
-- In production, you'd use a migration system, but for simplicity:
-- We'll add columns and handle "duplicate column" errors gracefully

-- Add test tracking columns to projects
-- Note: These will be added via ALTER TABLE in application code if needed
-- Since SQLite doesn't support IF NOT EXISTS for ALTER TABLE, we'll handle it in code

-- Testing metrics table
CREATE TABLE IF NOT EXISTS test_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id),
  processing_time_ms INTEGER,
  would_pay_for_this BOOLEAN,
  needs_improvement TEXT,
  output_quality_score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_test ON projects(test_number);
CREATE INDEX IF NOT EXISTS idx_test_metrics_project ON test_metrics(project_id);

