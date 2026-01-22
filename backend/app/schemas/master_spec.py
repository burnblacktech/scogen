from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional

# Import the outputs from our 4 cores
from app.schemas.modeling import DomainSpec
from app.schemas.workflow import DomainWorkflow
from app.schemas.pricing_model import ProjectEstimate
from app.schemas.compliance import ComplianceReport

class SpecMetadata(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    project_name: str
    user_intent: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"
    engine_version: str = "Scogen-QuadCore-v1"

class MasterSpec(BaseModel):
    """
    The Holy Grail.
    This single JSON object contains the entire architectural truth of a software project.
    """
    metadata: SpecMetadata
    dna: DomainSpec           # Core 1: Structure
    pulse: DomainWorkflow     # Core 2: Behavior
    shield: ComplianceReport  # Core 4: Security (Run before price to factor in costs)
    value: ProjectEstimate    # Core 3: Cost
