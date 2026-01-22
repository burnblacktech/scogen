# Core Database Schema (PostgreSQL)

## Overview

The Scogen database uses PostgreSQL with the following extensions:
- **pgvector** - Vector similarity search for AI embeddings
- **uuid-ossp** - UUID generation
- **pg_trgm** - Fuzzy text search

---

## 1. Projects (The Vault)

**Purpose**: Immutable frozen scopes - the source of truth for all project requirements.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id),
    
    -- Status Management
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'FROZEN', 'ACTIVE', 'ARCHIVED')),
    
    -- Maturity & Risk
    maturity_score INTEGER CHECK (maturity_score BETWEEN 0 AND 100),
    risk_profile JSONB,
    
    -- Immutability
    frozen_scope_hash TEXT,  -- SHA-256 hash of frozen requirement doc
    frozen_at TIMESTAMPTZ,
    
    -- Metadata
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_frozen_hash ON projects(frozen_scope_hash);
```

### Status Flow

```
DRAFT → FROZEN → ACTIVE → ARCHIVED
  ↑        ↓
  └────────┘ (Only with version increment)
```

### Risk Profile Structure

```json
{
  "technical_complexity": 7,
  "domain_familiarity": 4,
  "integration_points": 12,
  "regulatory_requirements": ["GDPR", "SOC2"],
  "timeline_pressure": "high",
  "budget_constraints": "medium"
}
```

---

## 2. Requirements (The Atoms)

**Purpose**: Granular, traceable requirements linked to archetypes.

```sql
CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Archetype Mapping
    archetype_ref TEXT,  -- e.g., 'AUTH_STD_01'
    
    -- Content
    description TEXT NOT NULL,
    acceptance_criteria TEXT[],
    
    -- Constraints
    constraints JSONB,
    
    -- Traceability
    traceability_tags TEXT[],
    
    -- Metadata
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_requirements_project ON requirements(project_id);
CREATE INDEX idx_requirements_archetype ON requirements(archetype_ref);
CREATE INDEX idx_requirements_tags ON requirements USING GIN(traceability_tags);
```

### Constraints Structure

```json
{
  "performance": {
    "max_response_time_ms": 200,
    "concurrent_users": 1000
  },
  "security": {
    "encryption": "AES-256",
    "authentication": "OAuth2 + 2FA"
  },
  "compliance": {
    "data_residency": "EU",
    "audit_retention_days": 2555
  }
}
```

---

## 3. Constraints_Registry (The Moat)

**Purpose**: Learn from past failures - semantic search for similar constraint violations.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE constraints_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Semantic Search
    trigger_condition VECTOR(1536),  -- OpenAI embedding
    trigger_text TEXT NOT NULL,
    
    -- Enforcement
    enforcement_rule TEXT NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('WARNING', 'ERROR', 'CRITICAL')),
    
    -- Learning
    origin_project UUID REFERENCES projects(id),
    failure_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Vector similarity index
CREATE INDEX idx_constraints_embedding ON constraints_registry 
USING ivfflat (trigger_condition vector_cosine_ops)
WITH (lists = 100);
```

### Example Constraint

```json
{
  "trigger_text": "Client requests real-time collaboration with offline support",
  "trigger_condition": [0.123, -0.456, ...],  // 1536-dim embedding
  "enforcement_rule": "Warn: Offline + real-time sync requires conflict resolution strategy. Recommend CRDT or operational transforms.",
  "severity": "WARNING",
  "failure_count": 3
}
```

### Similarity Search Query

```sql
-- Find similar past constraints
SELECT 
    trigger_text,
    enforcement_rule,
    failure_count,
    1 - (trigger_condition <=> $1::vector) AS similarity
FROM constraints_registry
WHERE 1 - (trigger_condition <=> $1::vector) > 0.8
ORDER BY similarity DESC
LIMIT 5;
```

---

## 4. Audit_Logs (The Evidence)

**Purpose**: Immutable audit trail for all scoping sessions.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    
    -- Audio Recording
    audio_s3_key TEXT,  -- Immutable link to MinIO
    audio_duration_seconds INTEGER,
    
    -- Transcription
    transcript_text TEXT,
    transcript_language VARCHAR(10),
    
    -- Sentiment Analysis
    sentiment_score FLOAT CHECK (sentiment_score BETWEEN -1.0 AND 1.0),
    sentiment_magnitude FLOAT,
    
    -- Consent & Legal
    user_consent_timestamp TIMESTAMPTZ NOT NULL,
    consent_version VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_session ON audit_logs(session_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### Immutability Enforcement

```sql
-- Prevent updates and deletes
CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

---

## 5. Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- Profile
    full_name TEXT,
    organization TEXT,
    role VARCHAR(50) DEFAULT 'CLIENT',
    
    -- Subscription
    subscription_tier VARCHAR(50) DEFAULT 'FREE',
    credits_remaining INTEGER DEFAULT 0,
    
    -- Security
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

---

## 6. Archetypes

```sql
CREATE TABLE archetypes (
    id TEXT PRIMARY KEY,  -- e.g., 'AUTH_STD_01'
    name TEXT NOT NULL,
    category VARCHAR(50),
    
    -- Pricing
    standard_market_hours DECIMAL NOT NULL,
    complexity_factors JSONB,
    
    -- Internal Assets
    component_id TEXT,
    assembly_hours DECIMAL,
    
    -- Metadata
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Pricing_Calculations

```sql
CREATE TABLE pricing_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    
    -- Client Price Components
    standard_hours DECIMAL,
    market_rate DECIMAL,
    complexity_multiplier DECIMAL,
    risk_buffer_percentage DECIMAL,
    client_price DECIMAL NOT NULL,
    
    -- Internal Cost Components
    actual_hours DECIMAL,
    resource_cost DECIMAL,
    license_fees DECIMAL,
    internal_cost DECIMAL NOT NULL,
    
    -- Margin Analysis
    margin_percentage DECIMAL,
    margin_guard_passed BOOLEAN,
    
    -- Audit
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculated_by UUID REFERENCES users(id),
    override_reason TEXT
);

CREATE INDEX idx_pricing_project ON pricing_calculations(project_id);
```

---

## 8. Tasks (Atomic Work Packets)

**Purpose**: The unit of execution. Small, isolated units of work (<4 hours).

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    requirement_id UUID REFERENCES requirements(id),
    
    -- Assignment
    assigned_to_id UUID REFERENCES users(id), -- The Freelancer
    persona_label VARCHAR(100), -- e.g. "Senior Backend Dev"
    
    -- State
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ASSIGNED, IN_PROGRESS, REVIEW, DONE, REJECTED
    
    -- Context & Economics
    technical_context JSONB, -- Input assets and constraints
    agreed_cost DECIMAL, -- Internal cost to pay freelancer
    time_limit_hours INTEGER, -- TTL
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. Proposals (The Deal Room)

**Purpose**: Interactive commercial offers accessible via public link.

```sql
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    
    -- The Key
    access_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ,
    
    -- commercial levers
    base_price DECIMAL,
    rush_price DECIMAL,
    
    -- State
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, ACCEPTED, EXPIRED
    client_ip VARCHAR(45),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_token ON proposals(access_token);
```

---

## Database Initialization

```bash
# Initialize database with tables and extensions
docker compose exec backend python init_db.py
```

This script will:
1. Enable `pgvector` extension
2. Create all tables defined in `app/db/models.py`
3. Verify table creation
```

---

## Backup Strategy

### Daily Backups
```bash
pg_dump -Fc scogen > backups/scogen_$(date +%Y%m%d).dump
```

### Point-in-Time Recovery
```sql
-- Enable WAL archiving
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
```

---

See also:
- [Master Context](./00-master-context.md)
- [Infrastructure](./01-infrastructure.md)
- [Pricing Algorithm](./02-pricing-algorithm.md)
