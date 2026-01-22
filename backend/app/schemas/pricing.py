"""
Pricing Schemas - Data Contracts
Pydantic models for pricing API requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class ComplexityLevel(str, Enum):
    """Task complexity levels affecting pricing"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    EXTREME = "EXTREME"


class PricingRequest(BaseModel):
    """
    Request for Shadow Pricing calculation / Trinity Simulation
    """
    task_name: str = Field(..., description="Name of the task/feature")
    standard_hours: float = Field(..., gt=0, description="Estimated hours for a standard developer")
    complexity: ComplexityLevel = Field(default=ComplexityLevel.MEDIUM, description="Task complexity level")
    
    # The Strategy (The Arbitrage)
    assigned_persona: str = Field(default="MID", description="Client sees this level")
    actual_resource: str = Field(default="JUNIOR", description="You use this resource")
    is_asset_reused: bool = Field(default=False, description="If True, efficiency gain")
    
    # Risk Factor Inputs (Phase 2.5)
    tech_stack_label: str = Field(default="Standard", description="e.g. Standard, Blockchain, AI")
    timeline_weeks: int = Field(default=4, description="Project duration")
    client_type: str = Field(default="INTERNAL", description="INTERNAL, ENTERPRISE, STARTUP")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_name": "Crypto App",
                "standard_hours": 500,
                "complexity": "HIGH",
                "assigned_persona": "SENIOR",
                "actual_resource": "MID",
                "is_asset_reused": True,
                "tech_stack_label": "Blockchain",
                "timeline_weeks": 2,
                "client_type": "ENTERPRISE"
            }
        }


class PricingResponse(BaseModel):
    """
    God Mode Pricing Response: The Trinity Realities
    """
    task_name: str
    
    # The Trinity
    internal_floor: float      # Model 1: Cost (Physics)
    market_anchor: float       # Model 2: Market Rate (Expectation)
    actuarial_ceiling: float   # Model 3: Risk Adjusted (Premium)
    
    # Analysis
    risk_factor_breakdown: str # Explanation of why Ceiling is high
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_name": "Crypto App",
                "internal_floor": 100000.0,
                "market_anchor": 1250000.0,
                "actuarial_ceiling": 2500000.0,
                "risk_factor_breakdown": "Tech Risk: 1.5x | Urgency: 2.0x | Client Profile: 1.2x"
            }
        }
