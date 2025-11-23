-- Precision Pivot Database Migration
-- Adds function-level precision tables alongside existing schema
-- Migration Strategy: Gradual (new tables alongside old, no data loss)

-- ============================================================================
-- CORE PRECISION TABLES
-- ============================================================================

-- 1. Features Table (Function-Level Mapping)
CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT NOT NULL,
    
    -- Feature Details
    feature_name TEXT NOT NULL,
    feature_category TEXT, -- 'authentication', 'payment', 'reporting'
    description TEXT,
    acceptance_criteria TEXT, -- JSON array stored as TEXT
    
    -- Multi-Dimensional Mapping
    function_count INTEGER DEFAULT 0,
    module_count INTEGER DEFAULT 0,
    
    -- Complexity & Estimation
    complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 5),
    estimated_hours REAL,
    actual_hours REAL, -- Post-project learning
    confidence_score REAL CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    
    -- Dependencies
    depends_on TEXT, -- JSON array of feature IDs
    blocks TEXT, -- JSON array of feature IDs this blocks
    
    -- Reusability
    reusable_component_id TEXT REFERENCES components(id),
    reusability_savings_hours REAL,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 2. Functions Table (Detailed Function Mapping)
CREATE TABLE IF NOT EXISTS functions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    feature_id TEXT NOT NULL,
    
    -- Function Details
    function_name TEXT NOT NULL,
    function_signature TEXT, -- Full function signature
    parameters TEXT, -- JSON: {name, type, required, description}
    return_type TEXT,
    
    -- Code Generation
    pseudocode TEXT, -- 95% complete pseudocode
    ai_instructions TEXT, -- Instructions for AI tools
    human_checkpoints TEXT, -- JSON array: Where human review needed
    
    -- Estimation
    estimated_hours REAL,
    actual_hours REAL,
    lines_of_code INTEGER,
    
    -- Indian Context
    includes_gst_logic INTEGER DEFAULT 0, -- BOOLEAN
    includes_compliance INTEGER DEFAULT 0, -- BOOLEAN
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

-- 3. Components Library Table (Reusable Components)
CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    
    -- Component Identity
    component_name TEXT NOT NULL UNIQUE,
    component_category TEXT,
    description TEXT,
    
    -- Reusability Metrics
    times_reused INTEGER DEFAULT 0,
    average_hours_saved REAL,
    success_rate REAL CHECK (success_rate BETWEEN 0.0 AND 1.0),
    
    -- Code & Implementation
    base_code TEXT, -- Template code
    customization_points TEXT, -- JSON: Variables that can be customized
    dependencies TEXT, -- JSON: Required packages/libraries
    
    -- Compatibility
    tech_stack TEXT, -- JSON: {language, framework, database}
    min_version_requirements TEXT, -- JSON
    
    -- Indian Specific
    includes_indian_compliance INTEGER DEFAULT 0, -- BOOLEAN
    industries_used TEXT, -- JSON array: ['fintech', 'ecommerce']
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);

-- 4. Cost Estimation Table (Enhanced Costing)
CREATE TABLE IF NOT EXISTS cost_estimates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT NOT NULL,
    
    -- Resource Planning
    team_composition TEXT, -- JSON: {seniors: 2, mids: 3, juniors: 2}
    
    -- Cost Breakdown (in INR)
    development_cost REAL,
    testing_cost REAL,
    project_management_cost REAL,
    
    -- Additional Costs
    infrastructure_cost REAL, -- Hosting, domains
    third_party_cost REAL, -- APIs, licenses
    compliance_cost REAL, -- CA, legal review
    
    -- Taxes & Margins
    gst_amount REAL, -- 18% GST
    profit_margin REAL,
    risk_buffer REAL,
    
    -- Final Numbers
    total_cost REAL,
    quoted_price REAL,
    
    -- Payment Schedule
    payment_milestones TEXT, -- JSON: [{milestone, percentage, amount}]
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 5. Sprint Plans Table (Holiday-Aware Sprint Planning)
CREATE TABLE IF NOT EXISTS sprint_plans (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT NOT NULL,
    
    sprint_number INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    working_days INTEGER,
    
    -- Sprint Goals
    sprint_goals TEXT, -- JSON array
    features_included TEXT, -- JSON array of Feature IDs
    
    -- Capacity Planning
    team_capacity_hours REAL,
    planned_hours REAL,
    buffer_hours REAL,
    
    -- Indian Context
    includes_holidays TEXT, -- JSON array: Holiday names
    festival_impact_factor REAL CHECK (festival_impact_factor BETWEEN 0.0 AND 1.0), -- 0.8 = 20% reduced capacity
    
    -- Checkpoints
    review_checkpoints TEXT, -- JSON: [{day, type, reviewer}]
    human_endpoints TEXT, -- JSON: [{task, description, estimated_hours}]
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, sprint_number)
);

-- 6. Learning Metrics Table (Accuracy Tracking)
CREATE TABLE IF NOT EXISTS learning_metrics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT,
    
    -- Accuracy Metrics
    overall_estimation_accuracy REAL, -- Percentage
    feature_level_accuracy TEXT, -- JSON: {feature_id: accuracy}
    
    -- What Went Wrong/Right
    overrun_reasons TEXT, -- JSON array
    success_factors TEXT, -- JSON array
    
    -- Learnings
    new_patterns_discovered TEXT, -- JSON array
    complexity_adjustments TEXT, -- JSON: {feature_type: adjustment_factor}
    
    -- Quality Metrics
    bugs_reported INTEGER,
    client_satisfaction_score INTEGER CHECK (client_satisfaction_score BETWEEN 1 AND 5),
    code_reuse_percentage REAL CHECK (code_reuse_percentage BETWEEN 0.0 AND 100.0),
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- 7. Industry Templates Table (Domain Knowledge)
CREATE TABLE IF NOT EXISTS industry_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    
    industry_name TEXT NOT NULL,
    template_name TEXT NOT NULL,
    
    -- Common Features
    standard_features TEXT, -- JSON: [{name, hours, complexity}]
    optional_features TEXT, -- JSON: [{name, hours, complexity}]
    
    -- Industry Specific
    compliance_requirements TEXT, -- JSON array
    standard_integrations TEXT, -- JSON array: ['Razorpay', 'Shiprocket']
    
    -- Typical Metrics
    typical_timeline_weeks INTEGER,
    typical_team_size INTEGER,
    typical_cost_range_min REAL,
    typical_cost_range_max REAL,
    
    -- Usage
    times_used INTEGER DEFAULT 0,
    average_accuracy REAL CHECK (average_accuracy BETWEEN 0.0 AND 100.0),
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(industry_name, template_name)
);

-- ============================================================================
-- SCHEMA BRIDGE TABLE (Migration Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_bridge (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    old_scope_id TEXT, -- Reference to old scopes table if exists
    new_project_id TEXT NOT NULL REFERENCES projects(id),
    migration_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    migrated_at DATETIME,
    migration_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ENHANCED PROJECTS TABLE (Add Precision Fields)
-- ============================================================================

-- Add precision fields to existing projects table
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check first
-- These will be added via a helper function that checks column existence

-- Note: Column additions are handled programmatically in db-manager-v2.js
-- to avoid errors if columns already exist

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_features_project ON features(project_id);
CREATE INDEX IF NOT EXISTS idx_features_category ON features(feature_category);
CREATE INDEX IF NOT EXISTS idx_functions_feature ON functions(feature_id);
CREATE INDEX IF NOT EXISTS idx_components_category ON components(component_category);
CREATE INDEX IF NOT EXISTS idx_components_name ON components(component_name);
CREATE INDEX IF NOT EXISTS idx_cost_estimates_project ON cost_estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_sprint_plans_project ON sprint_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_sprint_plans_dates ON sprint_plans(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_learning_metrics_project ON learning_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_industry_templates_industry ON industry_templates(industry_name);
CREATE INDEX IF NOT EXISTS idx_schema_bridge_project ON schema_bridge(new_project_id);
CREATE INDEX IF NOT EXISTS idx_schema_bridge_status ON schema_bridge(migration_status);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update updated_at timestamp for features
CREATE TRIGGER IF NOT EXISTS update_features_timestamp 
AFTER UPDATE ON features
BEGIN
    UPDATE features SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update last_used_at for components
CREATE TRIGGER IF NOT EXISTS update_components_last_used 
AFTER INSERT ON features
WHEN NEW.reusable_component_id IS NOT NULL
BEGIN
    UPDATE components SET last_used_at = CURRENT_TIMESTAMP, times_reused = times_reused + 1 
    WHERE id = NEW.reusable_component_id;
END;

