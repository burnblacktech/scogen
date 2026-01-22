from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class FieldDef(BaseModel):
    name: str = Field(..., description="Database column name (snake_case)")
    type: str = Field(..., description="SQL Type: UUID, VARCHAR, INTEGER, BOOLEAN, TIMESTAMP, JSONB")
    is_primary: bool = False
    is_nullable: bool = True
    description: str = Field(..., description="Business rationale for this field")

class RelationshipDef(BaseModel):
    target_entity: str
    type: Literal["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_MANY"]
    description: str

class EntityDef(BaseModel):
    name: str = Field(..., description="Table name (PascalCase)")
    description: str
    fields: List[FieldDef]
    relationships: List[RelationshipDef] = []

class DomainSpec(BaseModel):
    domain: str
    entities: List[EntityDef]
    compliance_notes: List[str] = []
