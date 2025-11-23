-- Migration 004: Complete Database Synchronization
-- Comprehensive sync of all intelligence, learning, component, template, and lifecycle tables
-- SQLite-compatible version
-- Run with: npm run db:migrate

-- ============================================
-- PART 1: ENSURE CORE TABLES EXIST
-- ============================================

-- Users table (ensure it exists with all columns)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    company_name TEXT,
    role TEXT DEFAULT 'user',
    token TEXT,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table - preserve existing structure, add new columns programmatically
-- Note: We don't recreate projects table, we add columns via ALTER TABLE in code
-- New columns to add: created_by, last_updated_by, company_name, project_status
-- Map existing 'status' column to 'project_status' if needed

-- ============================================
-- PART 2: INTELLIGENCE SYSTEM TABLES
-- ============================================

-- Features table with complexity tracking (SQLite-compatible)
CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT NOT NULL,
    
    -- Feature details
    feature_name TEXT NOT NULL,
    feature_category TEXT,
    description TEXT,
    acceptance_criteria TEXT, -- JSON array stored as TEXT
    
    -- Multi-dimensional complexity
    functional_complexity REAL DEFAULT 3.0,
    technical_complexity REAL DEFAULT 3.0,
    integration_complexity REAL DEFAULT 3.0,
    data_complexity REAL DEFAULT 3.0,
    business_complexity REAL DEFAULT 3.0,
    overall_complexity REAL DEFAULT 3.0,
    
    -- Estimation
    estimated_hours REAL,
    actual_hours REAL,
    calculated_hours REAL,
    confidence_score REAL,
    
    -- Dependencies
    depends_on TEXT, -- JSON array of feature IDs stored as TEXT
    blocks TEXT, -- JSON array of feature IDs stored as TEXT
    
    -- Reusability
    reusable_component_id TEXT,
    reusability_savings_hours REAL,
    
    -- Metadata
    complexity_factors TEXT, -- JSON stored as TEXT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Functions table (detailed function mapping) - SQLite-compatible
CREATE TABLE IF NOT EXISTS functions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    feature_id TEXT NOT NULL,
    
    -- Function details
    function_name TEXT NOT NULL,
    function_signature TEXT,
    parameters TEXT, -- JSON stored as TEXT
    return_type TEXT,
    
    -- Code generation
    pseudocode TEXT,
    ai_instructions TEXT,
    human_checkpoints TEXT, -- JSON array stored as TEXT
    
    -- Estimation
    complexity_score REAL,
    base_hours REAL,
    adjusted_hours REAL,
    hourly_rate REAL,
    rate_factors TEXT, -- JSON stored as TEXT
    
    -- Indian context
    includes_gst_logic INTEGER DEFAULT 0,
    includes_compliance INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

-- ============================================
-- PART 3: LEARNING SYSTEM TABLES
-- ============================================

-- Project actuals (already created in migration 002, but ensure it exists)
-- See migration 002 for table definition

-- Estimation patterns (already created in migration 002, but ensure it exists)
-- See migration 002 for table definition

-- Feature dependencies (already created in migration 002, but ensure it exists)
-- See migration 002 for table definition

-- Learning metrics table
CREATE TABLE IF NOT EXISTS learning_metrics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT,
    
    -- Accuracy metrics
    overall_estimation_accuracy REAL, -- Percentage
    feature_level_accuracy TEXT, -- JSON stored as TEXT
    
    -- What went wrong/right
    overrun_reasons TEXT, -- JSON array stored as TEXT
    success_factors TEXT, -- JSON array stored as TEXT
    
    -- Learnings
    new_patterns_discovered TEXT, -- JSON array stored as TEXT
    complexity_adjustments TEXT, -- JSON stored as TEXT
    
    -- Quality metrics
    bugs_reported INTEGER,
    client_satisfaction_score INTEGER CHECK (client_satisfaction_score BETWEEN 1 AND 5),
    code_reuse_percentage REAL CHECK (code_reuse_percentage BETWEEN 0.0 AND 100.0),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PART 4: COMPONENT LIBRARY
-- ============================================

-- Components table (already exists in precision pivot, ensure it exists)
CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    
    -- Component identity
    component_name TEXT NOT NULL UNIQUE,
    component_category TEXT,
    description TEXT,
    
    -- Reusability metrics
    times_reused INTEGER DEFAULT 0,
    average_hours_saved REAL,
    success_rate REAL CHECK (success_rate BETWEEN 0.0 AND 1.0),
    
    -- Code & implementation
    base_code TEXT,
    customization_points TEXT, -- JSON stored as TEXT
    dependencies TEXT, -- JSON stored as TEXT
    
    -- Compatibility
    tech_stack TEXT, -- JSON stored as TEXT
    min_version_requirements TEXT, -- JSON stored as TEXT
    
    -- Indian specific
    includes_indian_compliance INTEGER DEFAULT 0,
    industries_used TEXT, -- JSON array stored as TEXT
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);

-- Component usage tracking (NEW table)
CREATE TABLE IF NOT EXISTS component_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_id TEXT NOT NULL,
    project_id TEXT,
    feature_id TEXT,
    hours_saved REAL,
    customization_hours REAL,
    success INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (component_id) REFERENCES components(id)
);

-- ============================================
-- PART 5: TEMPLATE SYSTEM
-- ============================================

-- Industry templates (already exists in precision pivot, ensure it exists)
-- Note: If table exists, we'll add missing columns programmatically
CREATE TABLE IF NOT EXISTS industry_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    industry_name TEXT NOT NULL,
    template_name TEXT NOT NULL,
    standard_features TEXT,
    optional_features TEXT,
    compliance_requirements TEXT,
    standard_integrations TEXT,
    typical_timeline_weeks INTEGER,
    typical_team_size INTEGER,
    typical_cost_range_min REAL,
    typical_cost_range_max REAL,
    times_used INTEGER DEFAULT 0,
    average_accuracy REAL CHECK (average_accuracy BETWEEN 0.0 AND 100.0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(industry_name, template_name)
);

-- ============================================
-- PART 6: DEPENDENCIES & SPRINT PLANNING
-- ============================================

-- Feature dependencies (already in migration 002, ensure it exists)
-- Sprint plans (already exists in precision pivot, ensure it exists)
CREATE TABLE IF NOT EXISTS sprint_plans (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT NOT NULL,
    
    sprint_number INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    working_days INTEGER,
    
    -- Sprint content
    sprint_goals TEXT, -- JSON array stored as TEXT
    features_included TEXT, -- JSON array of feature IDs stored as TEXT
    
    -- Capacity planning
    team_capacity_hours REAL,
    planned_hours REAL,
    buffer_hours REAL,
    
    -- Indian context
    includes_holidays TEXT, -- JSON array stored as TEXT
    festival_impact_factor REAL CHECK (festival_impact_factor BETWEEN 0.0 AND 1.0),
    
    -- Checkpoints
    review_checkpoints TEXT, -- JSON stored as TEXT
    human_endpoints TEXT, -- JSON stored as TEXT
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, sprint_number)
);

-- ============================================
-- PART 7: COST ESTIMATION
-- ============================================

-- Cost estimates (already exists in precision pivot, ensure it exists)
CREATE TABLE IF NOT EXISTS cost_estimates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT NOT NULL,
    
    -- Resource planning
    team_composition TEXT, -- JSON stored as TEXT
    
    -- Cost breakdown (in INR)
    development_cost REAL,
    testing_cost REAL,
    project_management_cost REAL,
    
    -- Additional costs
    infrastructure_cost REAL,
    third_party_cost REAL,
    compliance_cost REAL,
    
    -- Taxes & margins
    gst_amount REAL,
    profit_margin REAL,
    risk_buffer REAL,
    
    -- Final numbers
    total_cost REAL,
    quoted_price REAL,
    
    -- Payment schedule
    payment_milestones TEXT, -- JSON stored as TEXT
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PART 8: PROJECT LIFECYCLE
-- ============================================

-- Project state logs (already in migration 003, ensure it exists)
-- See migration 003 for table definition

-- ============================================
-- PART 9: INDEXES FOR PERFORMANCE
-- ============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);

-- Project indexes (add if columns exist)
-- Note: These will be created programmatically if columns exist
-- CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(project_status);
-- CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
-- CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_name);

-- Feature indexes
CREATE INDEX IF NOT EXISTS idx_features_project ON features(project_id);
CREATE INDEX IF NOT EXISTS idx_features_category ON features(feature_category);
CREATE INDEX IF NOT EXISTS idx_features_complexity ON features(overall_complexity);

-- Function indexes
CREATE INDEX IF NOT EXISTS idx_functions_feature ON functions(feature_id);

-- Component indexes
CREATE INDEX IF NOT EXISTS idx_components_category ON components(component_category);
CREATE INDEX IF NOT EXISTS idx_components_name ON components(component_name);
CREATE INDEX IF NOT EXISTS idx_component_usage_component ON component_usage(component_id);
CREATE INDEX IF NOT EXISTS idx_component_usage_project ON component_usage(project_id);

-- Learning indexes
CREATE INDEX IF NOT EXISTS idx_project_actuals_project ON project_actuals(project_id);
CREATE INDEX IF NOT EXISTS idx_project_actuals_feature ON project_actuals(feature_id);
CREATE INDEX IF NOT EXISTS idx_learning_metrics_project ON learning_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_estimation_patterns_type ON estimation_patterns(pattern_type);

-- State log indexes (already in migration 003)
-- See migration 003 for indexes

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_industry_templates_industry ON industry_templates(industry_name);

-- Sprint plan indexes
CREATE INDEX IF NOT EXISTS idx_sprint_plans_project ON sprint_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_sprint_plans_dates ON sprint_plans(start_date, end_date);

-- Cost estimate indexes
CREATE INDEX IF NOT EXISTS idx_cost_estimates_project ON cost_estimates(project_id);

-- ============================================
-- PART 10: DEFAULT DATA
-- ============================================

-- Insert default admin user (password: admin123)
-- Password hash: sha256('admin123' + 'scogen-salt')
INSERT OR IGNORE INTO users (id, email, name, password_hash, role, token)
VALUES (
    1,
    'admin@scogen.io',
    'Admin User',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'admin',
    'default-admin-token-change-this'
);

-- Insert default industry templates
-- Note: Check if description column exists before inserting
-- If table exists without description, add it first
INSERT OR IGNORE INTO industry_templates (id, industry_name, template_name, standard_features, typical_timeline_weeks, typical_cost_range_min, typical_cost_range_max)
VALUES 
('template-ecommerce-basic', 'E-Commerce', 'Basic E-Commerce Platform',
 '["authentication","product_catalog","shopping_cart","checkout","payment","order_management"]',
 8, 800000, 1200000),
('template-fintech-mvp', 'Fintech', 'Fintech MVP',
 '["kyc","wallet","transactions","compliance","reporting","notifications"]',
 12, 1500000, 2000000),
('template-saas-starter', 'SaaS', 'SaaS Starter',
 '["authentication","subscription","billing","dashboard","api","admin_panel"]',
 12, 1800000, 2500000);

-- ============================================
-- PART 11: VIEWS FOR REPORTING
-- ============================================

-- Project overview view
CREATE VIEW IF NOT EXISTS project_overview AS
SELECT 
    p.id,
    p.project_code,
    p.project_name,
    p.status as project_status,
    COUNT(DISTINCT f.id) as feature_count,
    SUM(f.estimated_hours) as total_estimated_hours,
    AVG(f.confidence_score) as average_confidence,
    p.created_at
FROM projects p
LEFT JOIN features f ON f.project_id = p.project_code OR f.project_id = CAST(p.id AS TEXT)
GROUP BY p.id;

-- Learning progress view
CREATE VIEW IF NOT EXISTS learning_progress AS
SELECT 
    COUNT(DISTINCT pa.project_id) as projects_completed,
    AVG(CASE WHEN pa.estimated_hours > 0 THEN pa.actual_hours / pa.estimated_hours ELSE NULL END) as average_accuracy,
    COUNT(DISTINCT c.id) as components_created,
    COALESCE(SUM(cu.hours_saved), 0) as total_hours_saved
FROM project_actuals pa
LEFT JOIN components c ON 1=1
LEFT JOIN component_usage cu ON cu.component_id = c.id;

