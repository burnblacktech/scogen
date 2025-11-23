-- migrations/002_add_intelligence_fields.sql
-- Add intelligence tracking fields to existing tables
-- SQLite-compatible version (converted from PostgreSQL)

-- Note: ALTER TABLE ADD COLUMN IF NOT EXISTS is not supported in SQLite
-- These columns will be added programmatically with existence checks

-- Add complexity tracking to features table
-- Columns to add (handled programmatically):
--   functional_complexity REAL DEFAULT 3.0
--   technical_complexity REAL DEFAULT 3.0
--   integration_complexity REAL DEFAULT 3.0
--   data_complexity REAL DEFAULT 3.0
--   business_complexity REAL DEFAULT 3.0
--   overall_complexity REAL DEFAULT 3.0
--   calculated_hours REAL
--   confidence_score REAL
--   complexity_factors TEXT (JSON stored as TEXT)

-- Add dynamic pricing to functions table
-- Columns to add (handled programmatically):
--   complexity_score REAL
--   base_hours REAL
--   adjusted_hours REAL
--   hourly_rate REAL
--   rate_factors TEXT (JSON stored as TEXT)

-- Create historical accuracy table (SQLite-compatible)
CREATE TABLE IF NOT EXISTS project_actuals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT,
    feature_id TEXT,
    estimated_hours REAL,
    actual_hours REAL,
    estimated_cost REAL,
    actual_cost REAL,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    variance_reasons TEXT,
    complexity_misestimate REAL,
    domain TEXT,
    tech_stack TEXT,
    team_size INTEGER,
    client_type TEXT,
    bugs_reported INTEGER DEFAULT 0,
    client_satisfaction_score INTEGER,
    code_reuse_percentage REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create pattern library (SQLite-compatible)
CREATE TABLE IF NOT EXISTS estimation_patterns (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    pattern_name TEXT,
    pattern_type TEXT,
    conditions TEXT,
    hour_multiplier REAL,
    cost_multiplier REAL,
    occurrence_count INTEGER DEFAULT 1,
    accuracy_improvement REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create dependency graph table (SQLite-compatible)
CREATE TABLE IF NOT EXISTS feature_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id TEXT,
    depends_on TEXT,
    dependency_type TEXT,
    lag_time INTEGER DEFAULT 0,
    UNIQUE(feature_id, depends_on)
);

-- Create indexes for performance (after tables are created)
CREATE INDEX IF NOT EXISTS idx_project_actuals_project ON project_actuals(project_id);
CREATE INDEX IF NOT EXISTS idx_project_actuals_feature ON project_actuals(feature_id);
CREATE INDEX IF NOT EXISTS idx_project_actuals_domain ON project_actuals(domain);
CREATE INDEX IF NOT EXISTS idx_estimation_patterns_type ON estimation_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_feature_dependencies_feature ON feature_dependencies(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_dependencies_depends ON feature_dependencies(depends_on);

