"""
Constraints Router - The Moat API
Endpoints for teaching the system and consulting the immune system
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.db.base import get_db
from app.services.constraint_service import ConstraintService


router = APIRouter()
service = ConstraintService()


# --- Request/Response Schemas ---

class LearnRequest(BaseModel):
    """Request to teach the system a new constraint"""
    category: str = Field(..., description="Constraint category (e.g., 'Database', 'Infrastructure')")
    description: str = Field(..., description="What went wrong (the lesson)")
    enforcement_rule: str = Field(..., description="What to do instead (the fix)")
    is_active: bool = Field(default=True, description="Whether this constraint is active")
    
    class Config:
        json_schema_extra = {
            "example": {
                "category": "Infrastructure",
                "description": "App targets rural India or Tier-3 cities with poor connectivity",
                "enforcement_rule": "MUST implement Offline-First Sync (SQLite + WatermelonDB). NO real-time only sockets.",
                "is_active": True
            }
        }


class CheckRequest(BaseModel):
    """Request to scan for risks"""
    project_context: str = Field(..., description="Project description or requirement")
    threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Minimum similarity threshold")
    limit: int = Field(default=5, ge=1, le=20, description="Maximum warnings to return")
    
    class Config:
        json_schema_extra = {
            "example": {
                "project_context": "I want to build a video streaming app for farmers in Bihar with offline playback",
                "threshold": 0.7,
                "limit": 5
            }
        }


class ConstraintResponse(BaseModel):
    """Response with constraint details"""
    id: str
    category: str
    description: str
    enforcement_rule: str
    failure_count: int
    is_active: bool


class WarningResponse(BaseModel):
    """Response with risk warning"""
    id: str
    category: str
    risk: str
    enforcement: str
    relevance: float
    failure_count: int


# --- Endpoints ---

@router.post("/learn", response_model=Dict[str, str])
def learn_new_rule(payload: LearnRequest, db: Session = Depends(get_db)):
    """
    Teach the System a New Constraint
    
    Manually inject a lesson from a post-mortem or failure analysis.
    The system will vectorize this constraint and use it to warn
    about similar risks in future projects.
    
    **Use Cases**:
    - Project failed due to poor connectivity → Add offline-first rule
    - Database corruption in production → Add ACID compliance rule
    - Budget overrun on video streaming → Add bandwidth buffer rule
    
    **The Learning Loop**:
    1. Describe what went wrong
    2. Define the enforcement rule
    3. System vectorizes the description
    4. Future projects are scanned against this
    
    Returns:
        Confirmation with constraint ID
    """
    try:
        constraint = service.learn_constraint(
            db,
            category=payload.category,
            description=payload.description,
            enforcement_rule=payload.enforcement_rule,
            is_active=payload.is_active
        )
        
        return {
            "status": "LEARNED",
            "id": str(constraint.id),
            "message": f"Constraint learned in category: {payload.category}"
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to learn constraint: {str(e)}"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}"
        )


@router.post("/scan", response_model=Dict[str, Any])
def scan_for_risks(payload: CheckRequest, db: Session = Depends(get_db)):
    """
    Scan for Risks (Magic Foresight)
    
    Check if the current project idea violates any known laws of physics
    (i.e., constraints learned from past failures).
    
    **The Watchdog Process**:
    1. Vectorize the project description
    2. Semantic search against constraint registry
    3. Return warnings with relevance scores
    
    **Similarity Threshold**:
    - 0.9-1.0: Almost identical (definitely relevant)
    - 0.7-0.9: Very similar (likely relevant)
    - 0.5-0.7: Somewhat similar (maybe relevant)
    - <0.5: Different (not relevant)
    
    **Example**:
    - Input: "Video app for farmers in Bihar"
    - Matches: "Rural India" constraint (offline-first)
    - Matches: "Video streaming" constraint (bandwidth buffer)
    - Returns: 2 warnings with enforcement rules
    
    Returns:
        Status and list of warnings (if any)
    """
    try:
        warnings = service.check_constraints(
            db,
            context_input=payload.project_context,
            threshold=payload.threshold,
            limit=payload.limit
        )
        
        if not warnings:
            return {
                "status": "SAFE",
                "count": 0,
                "warnings": [],
                "message": "No risks detected. Proceed with caution."
            }
        
        return {
            "status": "RISK_DETECTED",
            "count": len(warnings),
            "warnings": warnings,
            "message": f"Found {len(warnings)} potential risks. Review enforcement rules."
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Scan failed: {str(e)}"
        )


@router.get("/list", response_model=List[ConstraintResponse])
def list_constraints(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    List All Constraints
    
    View all constraints in the moat (the immune system's memory).
    
    **Use Cases**:
    - Audit what the system has learned
    - Review constraints by category
    - Find constraints to deactivate
    
    Args:
        category: Filter by category (optional)
        active_only: Only show active constraints (default: true)
        
    Returns:
        List of constraints
    """
    try:
        constraints = service.list_all_constraints(
            db,
            category=category,
            active_only=active_only
        )
        
        return [
            ConstraintResponse(
                id=str(c.id),
                category=c.category,
                description=c.description,
                enforcement_rule=c.enforcement_rule,
                failure_count=c.failure_count,
                is_active=c.is_active
            )
            for c in constraints
        ]
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list constraints: {str(e)}"
        )


@router.post("/increment-failure/{constraint_id}")
def increment_failure(constraint_id: str, db: Session = Depends(get_db)):
    """
    Increment Failure Counter
    
    Track when a constraint is violated in production.
    This helps identify common mistakes vs rare edge cases.
    
    **High failure count** → Common mistake, needs better enforcement
    **Low failure count** → Rare edge case, constraint is working
    
    Args:
        constraint_id: UUID of the constraint
        
    Returns:
        Updated failure count
    """
    try:
        constraint = service.increment_failure_count(db, constraint_id)
        
        if not constraint:
            raise HTTPException(
                status_code=404,
                detail=f"Constraint not found: {constraint_id}"
            )
        
        return {
            "status": "INCREMENTED",
            "constraint_id": constraint_id,
            "failure_count": constraint.failure_count,
            "message": f"Failure count now: {constraint.failure_count}"
        }
    
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to increment: {str(e)}"
        )


@router.post("/deactivate/{constraint_id}")
def deactivate_constraint(constraint_id: str, db: Session = Depends(get_db)):
    """
    Deactivate a Constraint
    
    Soft delete a constraint when it's no longer relevant.
    
    **Use Cases**:
    - Technology has changed (e.g., MongoDB now supports transactions)
    - Rule was too strict
    - Constraint is outdated
    
    Args:
        constraint_id: UUID of the constraint
        
    Returns:
        Confirmation
    """
    try:
        constraint = service.deactivate_constraint(db, constraint_id)
        
        if not constraint:
            raise HTTPException(
                status_code=404,
                detail=f"Constraint not found: {constraint_id}"
            )
        
        return {
            "status": "DEACTIVATED",
            "constraint_id": constraint_id,
            "message": f"Constraint deactivated: {constraint.category}"
        }
    
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to deactivate: {str(e)}"
        )


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """
    Get Constraint Statistics
    
    View statistics about the constraint registry:
    - Total constraints
    - Active vs inactive
    - Breakdown by category
    - Top failures
    
    Returns:
        Statistics dictionary
    """
    try:
        stats = service.get_constraint_stats(db)
        return stats
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stats: {str(e)}"
        )


@router.get("/health")
def health_check():
    """
    Constraint Engine Health Check
    
    Verifies that the constraint engine is operational.
    Tests embedding service connectivity.
    
    Returns:
        Health status
    """
    from app.ai.embedding import test_embedding_service
    
    embedding_healthy = test_embedding_service()
    
    return {
        "status": "healthy" if embedding_healthy else "degraded",
        "embedding_service": "connected" if embedding_healthy else "unavailable",
        "message": "Constraint engine operational" if embedding_healthy else "Ollama not available"
    }
