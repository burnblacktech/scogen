"""
Archetype API Router
Exposes archetype library and project hydration endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.schemas.archetype import (
    ArchetypeDefinition,
    ApplyArchetypeRequest,
    ApplyArchetypeResponse
)
from app.services.archetype_service import ArchetypeService

router = APIRouter()
service = ArchetypeService()


@router.get("/", response_model=List[ArchetypeDefinition])
def list_archetypes():
    """
    List all available 'Frozen Assets' from the library
    
    Returns:
        List of archetype definitions with features and variance points
        
    Example Response:
        [
            {
                "id": "ARCH_CRM_STD_01",
                "name": "Standard CRM",
                "version": "1.0.0",
                "description": "Baseline CRM for SMEs",
                "base_hours": 320,
                "tech_stack": ["React", "Node.js", "PostgreSQL"],
                "features": [...],
                "variance_points": [...]
            }
        ]
    """
    return service.list_available_archetypes()


@router.get("/{archetype_id}")
def get_archetype(archetype_id: str):
    """
    Get a specific archetype by ID
    
    Args:
        archetype_id: Archetype identifier
        
    Returns:
        Archetype definition
        
    Raises:
        404: If archetype not found
    """
    archetype = service.get_archetype_by_id(archetype_id)
    if not archetype:
        raise HTTPException(status_code=404, detail=f"Archetype '{archetype_id}' not found")
    return archetype


@router.get("/{archetype_id}/summary")
def get_archetype_summary(archetype_id: str):
    """
    Get summary statistics for an archetype
    
    Args:
        archetype_id: Archetype identifier
        
    Returns:
        Summary with feature count, hours, categories
    """
    summary = service.get_archetype_summary(archetype_id)
    if "error" in summary:
        raise HTTPException(status_code=404, detail=summary["error"])
    return summary


@router.post("/apply", response_model=ApplyArchetypeResponse)
def apply_archetype(
    payload: ApplyArchetypeRequest,
    db: Session = Depends(get_db)
):
    """
    Hydrate a Project with requirements from an Archetype
    
    This is the core "Content Injection" endpoint that:
    1. Loads the archetype from library
    2. Processes variance responses (20% customization)
    3. Creates requirements in the database (80% standard features)
    
    Args:
        payload: Archetype application request
        db: Database session (injected)
        
    Returns:
        ApplyArchetypeResponse with results
        
    Example Request:
        {
            "project_id": "550e8400-e29b-41d4-a716-446655440000",
            "archetype_id": "ARCH_CRM_STD_01",
            "variance_responses": {
                "VAR_OTP": true,
                "VAR_SOCIAL": false
            }
        }
    
    Example Response:
        {
            "status": "SUCCESS",
            "requirements_added": 19,
            "project_id": "550e8400-e29b-41d4-a716-446655440000",
            "archetype_id": "ARCH_CRM_STD_01",
            "total_hours": 320,
            "message": "Successfully added 19 requirements from Standard CRM"
        }
    
    Raises:
        404: If archetype or project not found
        500: If database operation fails
    """
    try:
        return service.apply_archetype_to_project(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply archetype: {str(e)}")
