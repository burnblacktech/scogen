# Database Implementation Guide

## Overview

This document tracks the implementation of Scogen's database foundation using SQLAlchemy 2.0, PostgreSQL with pgvector, and comprehensive audit trails.

**Status**: ✅ Complete (2026-01-21)

---

## Architecture

### Technology Stack
- **ORM**: SQLAlchemy 2.0
- **Database**: PostgreSQL 16 with pgvector extension
- **Connection**: psycopg2-binary
- **Migrations**: Alembic 1.13.1

### Core Principles
1. **UUIDs**: All primary keys for security and scale
2. **JSONB**: Flexible schema for evolving data
3. **Vectors**: AI-powered semantic search (768 dimensions)
4. **Timestamps**: Comprehensive audit trails

---

## Database Schema

### Tables Created

#### 1. users
**Purpose**: Identity management for admins, freelancers, and clients

```sql
CREATE TABLE scogen.users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR,
    role VARCHAR DEFAULT 'CLIENT',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL
);
```

**Indexes**:
- `ix_users_email` (unique)

---

#### 2. projects (The Vault)
**Purpose**: Core project entity with frozen scope capability

```sql
CREATE TABLE scogen.projects (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR NOT NULL,
    description TEXT,
    status projectstatus NOT NULL DEFAULT 'DRAFT',
    maturity_score INTEGER DEFAULT 0,
    risk_profile JSONB DEFAULT '{}',
    commercial_profile JSONB DEFAULT '{}',
    frozen_scope_hash VARCHAR,
    frozen_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

**Enums**:
- `projectstatus`: DRAFT, FROZEN, ACTIVE, ARCHIVED, DISPUTED

**Indexes**:
- `ix_projects_owner_id`

---

#### 3. requirements (The Atoms)
**Purpose**: Individual scope items from archetypes

```sql
CREATE TABLE scogen.requirements (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    archetype_ref VARCHAR,
    title VARCHAR NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    constraints JSONB DEFAULT '{}',
    complexity_score FLOAT DEFAULT 1.0,
    estimated_hours FLOAT DEFAULT 0.0,
    created_at TIMESTAMP NOT NULL
);
```

**Indexes**:
- `ix_requirements_project_id`

---

#### 4. constraint_registry (The Moat)
**Purpose**: Learned constraints from failures for AI-powered prevention

```sql
CREATE TABLE scogen.constraint_registry (
    id UUID PRIMARY KEY,
    category VARCHAR NOT NULL,
    description TEXT NOT NULL,
    embedding VECTOR(768),
    enforcement_rule TEXT NOT NULL,
    failure_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL
);
```

**Indexes**:
- `ix_constraint_registry_category`

**Vector Search**:
- Uses nomic-embed-text (768 dimensions)
- Semantic similarity for constraint matching

---

#### 5. audit_logs (The Evidence)
**Purpose**: Immutable audit trail for legal evidence

```sql
CREATE TABLE scogen.audit_logs (
    id UUID PRIMARY KEY,
    session_id VARCHAR,
    project_id UUID REFERENCES projects(id),
    action_type VARCHAR NOT NULL,
    actor_id UUID,
    payload JSONB,
    evidence_s3_key VARCHAR,
    timestamp TIMESTAMP NOT NULL
);
```

**Indexes**:
- `ix_audit_logs_session_id`
- `ix_audit_logs_timestamp`

**Immutability**: No UPDATE/DELETE at application layer

---

## Implementation Files

### 1. Database Connection
**File**: `backend/app/db/base.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{db}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

### 2. SQLAlchemy Models
**File**: `backend/app/db/models.py`

Key features:
- UUID primary keys with `uuid.uuid4()` default
- JSONB columns for flexible data
- Vector columns for AI embeddings
- Enums for type safety
- Relationships with cascade deletes

Example:
```python
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.DRAFT)
    risk_profile = Column(JSONB, default=dict)
    frozen_scope_hash = Column(String, nullable=True)
    
    requirements = relationship("Requirement", back_populates="project", cascade="all, delete-orphan")
```

---

### 3. Initialization Script
**File**: `backend/init_db.py`

```python
from app.db.base import engine, Base
from sqlalchemy import text

def init_db():
    # Enable pgvector extension
    with engine.connect() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.commit()
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
```

---

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

Required packages:
- sqlalchemy>=2.0.0
- psycopg2-binary
- pgvector
- alembic

---

### 2. Configure Database
**File**: `backend/app/config.py`

```python
class Settings(BaseSettings):
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5433
    POSTGRES_DB: str = "scogen"
    POSTGRES_USER: str = "scogen"
    POSTGRES_PASSWORD: str = "changeme"
```

---

### 3. Initialize Database
```bash
python init_db.py
```

Expected output:
```
⏳ Connecting to Database...
📦 Enabling pgvector extension...
✅ pgvector extension enabled.
🏗️  Creating database tables...
✅ Database Initialization Complete!
```

---

### 4. Verify Tables
```bash
docker exec -it scogen-postgres psql -U scogen -d scogen -c "\dt"
```

Expected result:
```
 Schema |        Name         | Type  | Owner
--------+---------------------+-------+--------
 scogen | audit_logs          | table | scogen
 scogen | constraint_registry | table | scogen
 scogen | projects            | table | scogen
 scogen | requirements        | table | scogen
 scogen | users               | table | scogen
```

---

## Usage Examples

### Creating a User
```python
from app.db import SessionLocal, User

db = SessionLocal()

user = User(
    email="admin@scogen.com",
    full_name="Admin User",
    role="OWNER"
)
db.add(user)
db.commit()
db.refresh(user)

print(f"Created user: {user.id}")
```

---

### Creating a Project
```python
from app.db import SessionLocal, Project, ProjectStatus

db = SessionLocal()

project = Project(
    owner_id=user_id,
    name="CRM System for ABC Corp",
    description="Standard CRM with custom reporting",
    status=ProjectStatus.DRAFT,
    maturity_score=75,
    risk_profile={
        "technical_risk": "LOW",
        "budget_risk": "MEDIUM",
        "timeline_risk": "LOW"
    },
    commercial_profile={
        "client_budget": 500000,
        "estimated_margin": 0.45
    }
)
db.add(project)
db.commit()
```

---

### Adding Requirements
```python
from app.db import SessionLocal, Requirement

db = SessionLocal()

requirement = Requirement(
    project_id=project_id,
    archetype_ref="AUTH_STD_01",
    title="Email/Password Authentication",
    description="User login with bcrypt hashing",
    acceptance_criteria="Users can login with valid credentials",
    constraints={
        "must_use": "bcrypt",
        "hash_rounds": 12,
        "session_timeout": 3600
    },
    complexity_score=1.2,
    estimated_hours=8.0
)
db.add(requirement)
db.commit()
```

---

### Vector Search for Constraints
```python
from app.db import SessionLocal, ConstraintRegistry
from sqlalchemy import text

db = SessionLocal()

# Get embedding from Ollama
query_embedding = ollama_client.embed("fintech payment gateway")

# Search for similar constraints
query = text("""
    SELECT id, category, description, enforcement_rule,
           1 - (embedding <=> :embedding::vector) AS similarity
    FROM scogen.constraint_registry
    WHERE 1 - (embedding <=> :embedding::vector) > 0.8
    ORDER BY similarity DESC
    LIMIT 5;
""")

results = db.execute(query, {"embedding": query_embedding}).fetchall()

for row in results:
    print(f"Constraint: {row.description} (similarity: {row.similarity:.2f})")
```

---

### Creating Audit Logs
```python
from app.db import SessionLocal, AuditLog

db = SessionLocal()

audit = AuditLog(
    session_id="sess_abc123",
    project_id=project_id,
    action_type="SCOPE_FREEZE",
    actor_id=user_id,
    payload={
        "frozen_scope_hash": "a3f5b8c9d2e1...",
        "requirements_count": 19,
        "estimated_hours": 320
    },
    evidence_s3_key="scopes/proj-123/frozen-scope.pdf"
)
db.add(audit)
db.commit()
```

---

## Alembic Migrations

### Setup (Future)
```bash
cd backend
alembic init alembic
```

### Configuration
Edit `alembic/env.py`:
```python
from app.db.base import Base
from app.db.models import User, Project, Requirement, ConstraintRegistry, AuditLog

target_metadata = Base.metadata
```

### Create Migration
```bash
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

---

## Performance Considerations

### Indexes
- All foreign keys indexed automatically
- Email field has unique index
- Timestamp fields indexed for queries
- Category field indexed for filtering

### Connection Pooling
- Pool size: 10 connections
- Max overflow: 20 connections
- Pre-ping enabled (connection verification)

### Query Optimization
- Use `joinedload()` for eager loading relationships
- Use `selectinload()` for collections
- Avoid N+1 queries with proper eager loading

Example:
```python
from sqlalchemy.orm import joinedload

projects = db.query(Project)\
    .options(joinedload(Project.requirements))\
    .filter(Project.owner_id == user_id)\
    .all()
```

---

## Troubleshooting

### Connection Refused
```bash
# Check PostgreSQL is running
docker ps | grep scogen-postgres

# Check logs
docker logs scogen-postgres

# Verify port
docker port scogen-postgres
```

### pgvector Extension Error
```bash
# Enable extension manually
docker exec -it scogen-postgres psql -U scogen -c "CREATE EXTENSION vector;"
```

### Import Errors
```bash
# Ensure correct directory
cd backend

# Reinstall dependencies
pip install -r requirements.txt
```

---

## Next Steps

1. **Priority 2**: Implement Pricing Engine
2. **Priority 3**: Build Archetype Loader
3. **Priority 4**: AI Integration (vector search)
4. **Priority 5**: API Endpoints

---

## References

- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)

---

**Last Updated**: 2026-01-21  
**Status**: Production Ready  
**Version**: 1.0.0
