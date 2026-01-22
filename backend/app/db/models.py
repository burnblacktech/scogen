"""
SQLAlchemy 2.0 Models - The Vault Logic
Implements the database schema from docs/03-database-schema.md

Core Principles:
- UUIDs for all primary keys (security/scale)
- JSONB for flexible data (risk profiles, constraints)
- Vectors for AI (constraint engine semantic search)
- Timestamps for evidence (audit trails)
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from .base import Base


# --- ENUMS (Strict Typing for Status) ---

class ProjectStatus(str, enum.Enum):
    """Project lifecycle states"""
    DRAFT = "DRAFT"          # Initial state, requirements being gathered
    FROZEN = "FROZEN"        # Scope locked, hash generated
    READY_TO_BUILD = "READY_TO_BUILD" # Handshake Complete
    ACTIVE = "ACTIVE"        # Execution in progress
    ARCHIVED = "ARCHIVED"    # Completed or cancelled
    DISPUTED = "DISPUTED"    # Under dispute resolution


class ConstraintStatus(str, enum.Enum):
    """Lifecycle of a constraint rule"""
    ACTIVE = "ACTIVE"       # Verified Rule (The Moat)
    CANDIDATE = "CANDIDATE" # Learned from Web/AI (Needs Review)
    REJECTED = "REJECTED"   # Manually dismissed by Admin


class MaturityLevel(str, enum.Enum):
    """Client requirement maturity (The Silent Listener assessment)"""
    L1_IDEA = "L1_IDEA"              # Vague concept, high noise
    L2_WISHLIST = "L2_WISHLIST"      # Feature list, no constraints
    L3_FLOW = "L3_FLOW"              # User flows defined
    L4_BLUEPRINT = "L4_BLUEPRINT"    # Technical details specified


# --- CORE TABLES ---

class User(Base):
    """
    Agency Admins, Freelancers, or Clients
    Identity management - Auth logic handled by middleware
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="CLIENT")  # OWNER, ADMIN, FREELANCER, CLIENT
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    projects = relationship("Project", back_populates="owner")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class Project(Base):
    """
    The Vault Entry
    Once status becomes 'FROZEN', frozen_scope_hash MUST be set
    Immutable after freeze - any changes require new version
    """
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # The State Machine
    status = Column(Enum(ProjectStatus), default=ProjectStatus.DRAFT, nullable=False)
    maturity_score = Column(Integer, default=0)  # 0-100 (The Silent Listener)
    
    # The Dynamic Profiles (JSONB allows schema evolution)
    risk_profile = Column(JSONB, default=dict)
    # Example: {"technical_risk": "HIGH", "budget_risk": "LOW", "timeline_risk": "MEDIUM"}
    
    commercial_profile = Column(JSONB, default=dict)
    # Example: {"client_budget": 50000, "estimated_margin": 0.45, "payment_terms": "50-50"}
    
    # The Evidence Chain
    frozen_scope_hash = Column(String, nullable=True)  # SHA-256 of the PDF
    frozen_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="projects")
    requirements = relationship("Requirement", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project(id={self.id}, name={self.name}, status={self.status})>"


class Requirement(Base):
    """
    The Atoms
    Specific line items derived from Archetypes or Variance
    Each requirement maps to test cases (traceability matrix)
    """
    __tablename__ = "requirements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    
    # Traceability
    archetype_ref = Column(String, nullable=True)  # e.g., "AUTH_STD_01", "LEADS_01"
    
    # Content
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    acceptance_criteria = Column(Text, nullable=True)  # The 'Output Node' definition
    
    # Tech Logic
    constraints = Column(JSONB, default=dict)
    # Example: {"must_use": "NextAuth", "cannot_use": "Firebase", "performance": "<200ms"}
    
    # The Nervous System - Traceability Metadata (The Nerve Endings)
    traceability_meta = Column(JSONB, default=dict)
    # Example: {
    #   "code_namespace": "src.modules.auth",
    #   "expected_file_pattern": "src/modules/auth/*.ts",
    #   "test_id_pattern": "TEST_AUTH_*",
    #   "security_level": "CRITICAL",
    #   "module": "auth",
    #   "required_files": ["src/auth/service.py"],
    #   "test_coverage_threshold": 100,
    #   "forbidden_patterns": ["plain_text_password", "eval()", "console.log"]
    # }
    
    # Pricing Factors
    complexity_score = Column(Float, default=1.0)  # Multiplier for pricing
    estimated_hours = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="requirements")

    def __repr__(self):
        return f"<Requirement(id={self.id}, title={self.title}, archetype_ref={self.archetype_ref})>"


class ConstraintRegistry(Base):
    """
    The Moat
    Stores lessons learned from failures
    Used for Vector Search during Scoping to prevent repeat mistakes
    """
    __tablename__ = "constraint_registry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    category = Column(String, index=True, nullable=False)  # "Database", "Payment", "Security"
    description = Column(Text, nullable=False)
    
    # The Brain (Vector Embedding for Semantic Search)
    # Dimension: 384 for all-MiniLM-L6-v2, 1536 for OpenAI, 768 for nomic-embed-text
    embedding = Column(Vector(768), nullable=True)  # Using nomic-embed-text dimension
    
    enforcement_rule = Column(Text, nullable=False)
    # Example: "If fintech project, block MongoDB selection"
    
    failure_count = Column(Integer, default=0)  # How many times this failure occurred
    
    is_active = Column(Boolean, default=True)
    status = Column(Enum(ConstraintStatus), default=ConstraintStatus.ACTIVE, nullable=False)
    source_url = Column(String, nullable=True) # Where did we learn this?
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ConstraintRegistry(id={self.id}, category={self.category}, failures={self.failure_count})>"


class TaskStatus(str, enum.Enum):
    """Execution states for an Atomic Work Packet"""
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    DONE = "DONE"
    REJECTED = "REJECTED"


class Task(Base):
    """
    The Atomic Work Packet (AWP).
    Linked to a Requirement, assigned to a User (Persona).
    Traceability: Priority 7
    """
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"))
    requirement_id = Column(UUID(as_uuid=True), ForeignKey("requirements.id"))
    
    # Assignment
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # The Freelancer
    persona_label = Column(String) # e.g. "Senior Backend Dev"
    
    # State
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    
    # The Constraints (Inherited from Req + Airlock Rules)
    technical_context = Column(JSONB) # { "airlock_path": "auth/login", "nerves": {...} }
    
    # Economics
    agreed_cost = Column(Float) # Internal Cost
    time_limit_hours = Column(Integer) # Time To Live (TTL)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project")
    requirement = relationship("Requirement")
    assignee = relationship("User")


class AuditLog(Base):
    """
    The Evidence
    Immutable log of every critical action
    No UPDATE or DELETE allowed (enforced at application layer)
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String, index=True, nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    
    action_type = Column(String, nullable=False)  # "SCOPE_FREEZE", "DISPUTE_RAISED", "PAYMENT_RECEIVED"
    actor_id = Column(UUID(as_uuid=True), nullable=True)  # Who performed the action
    
    payload = Column(JSONB, nullable=True)  # Snapshot of data at that moment
    
    # S3/MinIO Reference
    evidence_s3_key = Column(String, nullable=True)  # Path to audio/PDF in MinIO
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action_type}, timestamp={self.timestamp})>"
class Proposal(Base):
    """
    The Deal Room.
    Stores the sanitized commercial terms accessible via a public token.
    """
    __tablename__ = "proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"))
    
    # The Key
    access_token = Column(String, unique=True, index=True) 
    expires_at = Column(DateTime)
    
    # The Levers (What can the client touch?)
    base_price = Column(Float) # The Standard Price (Anchor)
    rush_price = Column(Float) # The Urgency Price (Ceiling)
    
    # State
    status = Column(String, default="OPEN") # OPEN, ACCEPTED, EXPIRED
    client_ip = Column(String, nullable=True) # To track who opened it
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project")


class Freelancer(Base):
    """
    The Supply.
    Registered freelancers/personas available for task assignment.
    """
    __tablename__ = "freelancers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    email = Column(String, unique=True)
    
    # Skills mapping (e.g. ["React", "Python"])
    skills = Column(JSONB) 
    
    # Economics
    hourly_rate = Column(Float)
    rating = Column(Float, default=5.0)
    
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<Freelancer(id={self.id}, name={self.name})>"
