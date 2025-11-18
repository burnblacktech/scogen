-- Migration: Add Documentation Metrics Table
-- Stores coverage and quality metrics for generated documentation levels

CREATE TABLE IF NOT EXISTS documentation_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    level INTEGER NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    metric_data TEXT, -- JSON for complex metrics
    computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects (id),
    UNIQUE(project_id, level, metric_name)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_doc_metrics_project ON documentation_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_metrics_level ON documentation_metrics(level, metric_name);

