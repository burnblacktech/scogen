-- Enhanced Database Schema V2 for SCOGEN Platform
-- Uses better-sqlite3 (synchronous, no promises needed)

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. Clients table
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_identifier TEXT UNIQUE NOT NULL,
    company_name TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    
    -- Profile (accumulated)
    tech_savvy TEXT DEFAULT 'medium',
    typical_budget_range TEXT,
    industry TEXT,
    client_type TEXT,
    
    -- Historical metrics
    total_projects INTEGER DEFAULT 0,
    completed_projects INTEGER DEFAULT 0,
    failed_projects INTEGER DEFAULT 0,
    total_value REAL DEFAULT 0,
    avg_scope_creep REAL DEFAULT 0,
    avg_payment_delay INTEGER DEFAULT 0,
    
    -- Internal ratings
    reliability_score REAL DEFAULT 5.0,
    profitability_score REAL DEFAULT 5.0,
    ease_of_work_score REAL DEFAULT 5.0,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 2. Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_code TEXT UNIQUE NOT NULL,
    client_id INTEGER NOT NULL,
    project_name TEXT NOT NULL,
    status TEXT DEFAULT 'scoping',
    
    -- Input
    original_input TEXT,
    input_type TEXT,
    input_quality_score REAL,
    
    -- Analysis results (JSON)
    client_profile TEXT,
    extracted_modules TEXT,
    refined_scope TEXT,
    technical_breakdown TEXT,
    edge_cases TEXT,
    assumptions TEXT,
    
    -- Estimates
    base_estimate TEXT,
    hidden_costs TEXT,
    scenarios TEXT,
    selected_scenario TEXT,
    
    -- Quoted vs Actual
    quoted_cost REAL,
    quoted_timeline_days INTEGER,
    actual_cost REAL,
    actual_timeline_days INTEGER,
    
    -- Outcomes
    client_satisfaction INTEGER,
    profitability REAL,
    scope_creep_percentage REAL,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    FOREIGN KEY (client_id) REFERENCES clients (id)
);

-- 3. Hidden cost actuals
CREATE TABLE IF NOT EXISTS hidden_cost_actuals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    cost_type TEXT NOT NULL,
    
    estimated_percentage REAL,
    estimated_amount REAL,
    estimated_factors TEXT,
    
    actual_percentage REAL,
    actual_amount REAL,
    actual_factors TEXT,
    
    variance REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- 4. Scope changes
CREATE TABLE IF NOT EXISTS scope_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    change_type TEXT,
    
    module_affected TEXT,
    description TEXT,
    
    cost_impact REAL,
    timeline_impact_days INTEGER,
    
    requested_by TEXT,
    approved_by TEXT,
    approval_status TEXT DEFAULT 'pending',
    
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- 5. Learned patterns
CREATE TABLE IF NOT EXISTS learned_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL,
    domain TEXT,
    pattern_key TEXT NOT NULL,
    pattern_value TEXT,
    
    occurrence_count INTEGER DEFAULT 1,
    success_rate REAL DEFAULT 0,
    confidence_score REAL DEFAULT 0,
    
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(pattern_type, domain, pattern_key)
);

-- 6. Estimation accuracy
CREATE TABLE IF NOT EXISTS estimation_accuracy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_name TEXT NOT NULL,
    domain TEXT,
    
    total_estimates INTEGER DEFAULT 0,
    total_actual_effort REAL DEFAULT 0,
    total_estimated_effort REAL DEFAULT 0,
    
    avg_variance REAL DEFAULT 0,
    accuracy_percentage REAL DEFAULT 100,
    recommended_multiplier REAL DEFAULT 1.0,
    
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(module_name, domain)
);

-- 7. Learning lessons (for duplicate filtering)
CREATE TABLE IF NOT EXISTS learning_lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_hash TEXT UNIQUE NOT NULL,
    lesson_type TEXT NOT NULL,
    lesson_content TEXT NOT NULL,
    first_seen_project_id INTEGER,
    occurrence_count INTEGER DEFAULT 1,
    confidence_score REAL DEFAULT 0.5,
    applied_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_applied_at DATETIME,
    FOREIGN KEY (first_seen_project_id) REFERENCES projects (id)
);

-- 8. Migrations tracking
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Checkpoint states (for prescriptive checkpoint mode)
CREATE TABLE IF NOT EXISTS checkpoint_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    checkpoint_name TEXT NOT NULL,
    state_data TEXT NOT NULL,
    project_id INTEGER,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, checkpoint_id),
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- 10. Checkpoint decisions
CREATE TABLE IF NOT EXISTS checkpoint_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    decision_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES execution_sessions (session_id)
);

-- 11. Execution sessions
CREATE TABLE IF NOT EXISTS execution_sessions (
    session_id TEXT PRIMARY KEY,
    project_id INTEGER,
    current_checkpoint TEXT,
    status TEXT DEFAULT 'running',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_completed ON projects(completed_at);
CREATE INDEX IF NOT EXISTS idx_projects_industry ON projects(client_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_identifier ON clients(client_identifier);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_industry ON clients(industry);
CREATE INDEX IF NOT EXISTS idx_patterns_lookup ON learned_patterns(pattern_type, domain, pattern_key);
CREATE INDEX IF NOT EXISTS idx_patterns_domain ON learned_patterns(domain);
CREATE INDEX IF NOT EXISTS idx_accuracy_lookup ON estimation_accuracy(module_name, domain);
CREATE INDEX IF NOT EXISTS idx_accuracy_domain ON estimation_accuracy(domain);
CREATE INDEX IF NOT EXISTS idx_hidden_costs_project ON hidden_cost_actuals(project_id);
CREATE INDEX IF NOT EXISTS idx_hidden_costs_type ON hidden_cost_actuals(cost_type);
CREATE INDEX IF NOT EXISTS idx_scope_changes_project ON scope_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_scope_changes_date ON scope_changes(change_date);
CREATE INDEX IF NOT EXISTS idx_lessons_hash ON learning_lessons(lesson_hash);
CREATE INDEX IF NOT EXISTS idx_lessons_type ON learning_lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_lessons_project ON learning_lessons(first_seen_project_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_states_session ON checkpoint_states(session_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_states_checkpoint ON checkpoint_states(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_states_project ON checkpoint_states(project_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_decisions_session ON checkpoint_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_decisions_checkpoint ON checkpoint_decisions(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_execution_sessions_project ON execution_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_execution_sessions_status ON execution_sessions(status);

-- 12. Conversations table (for conversation mode)
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    state TEXT NOT NULL, -- JSON: conversation state
    completeness INTEGER DEFAULT 0,
    requirements TEXT, -- JSON: extracted requirements
    status TEXT DEFAULT 'active', -- active, saved, completed, abandoned
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Conversation turns table (for conversation history)
CREATE TABLE IF NOT EXISTS conversation_turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    turn_number INTEGER NOT NULL,
    user_input TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    extracted_data TEXT, -- JSON: extracted requirements from this turn
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Indexes for conversation tables
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_conversation ON conversation_turns(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_turn ON conversation_turns(conversation_id, turn_number);

