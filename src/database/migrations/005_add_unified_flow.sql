-- Migration 005: Add unified flow tables
-- Created: 2025-01-XX

-- Document generation tracking
CREATE TABLE IF NOT EXISTS document_generations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT REFERENCES projects(id),
    document_type TEXT NOT NULL CHECK(document_type IN ('cost', 'business', 'technical')),
    level TEXT NOT NULL CHECK(level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
    format TEXT DEFAULT 'pdf' CHECK(format IN ('pdf', 'html', 'xlsx', 'docx')),
    include_amc INTEGER DEFAULT 0,
    include_training INTEGER DEFAULT 0,
    include_dr INTEGER DEFAULT 0,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pdf_path TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'generating', 'completed', 'failed', 'partial')),
    error_message TEXT,
    deleted_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AMC packages
CREATE TABLE IF NOT EXISTS amc_packages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT REFERENCES projects(id),
    package_type TEXT NOT NULL CHECK(package_type IN ('basic', 'standard', 'premium')),
    annual_cost REAL NOT NULL,
    monthly_cost REAL NOT NULL,
    coverage TEXT,
    sla TEXT,
    terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PDF generation errors (for analytics)
CREATE TABLE IF NOT EXISTS pdf_generation_errors (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    document_generation_id TEXT REFERENCES document_generations(id),
    error_type TEXT,
    error_message TEXT,
    stack_trace TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_gen_project ON document_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_gen_status ON document_generations(status);
CREATE INDEX IF NOT EXISTS idx_amc_project ON amc_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_pdf_errors_doc ON pdf_generation_errors(document_generation_id);

