from pydantic import BaseModel, Field
from typing import List

class CostBreakdown(BaseModel):
    category: str # "Database Layer", "Logic Layer", "Integration Layer"
    item_count: int
    base_hours: float
    risk_factor: float
    total_hours: float

class ProjectEstimate(BaseModel):
    total_hours: float
    estimated_cost_inr: float
    timeline_weeks: int
    risk_score: str # LOW, MEDIUM, HIGH
    breakdown: List[CostBreakdown]
