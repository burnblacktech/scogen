from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.services.project_service import IngestionService
from app.services.freeze_service import FreezeService
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

router = APIRouter()
ingestion_service = IngestionService()
freeze_service = FreezeService()

# --- SCHEMAS ---

class IngestRequest(BaseModel):
    user_id: str
    session_id: str
    input_text: str
    client_type: Optional[str] = "web"

class FreezeRequest(BaseModel):
    project_id: str

# --- ENDPOINTS ---

@router.post("/ingest")
async def ingest_project_data(payload: IngestRequest):
    """
    The Silent Listener - Ingest project description
    Returns detected keywords and maturity score increment.
    """
    try:
        result = ingestion_service.process_input(payload.input_text)
        return {
            "status": "success",
            "response_text": result["response_text"],
            "detected_keywords": result["detected_keywords"],
            "maturity_score": 10, # Minimal starting score for demo
            "context_locked": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/projects/ingest")
async def ingest_project_data_projects(payload: IngestRequest):
    """Fallback for specific frontend path"""
    return await ingest_project_data(payload)

@router.post("/{project_id}/freeze")
def freeze_project_scope(project_id: str, db: Session = Depends(get_db)):
    """
    The 'Red Button'. Locks the scope and generates the legal contract.
    Priority 6: The Evidence Chain
    """
    try:
        return freeze_service.freeze_project(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/{project_id}/requirements")
def get_project_requirements(project_id: str, db: Session = Depends(get_db)):
    """Fetch all requirements for a project"""
    from app.db.models import Requirement
    reqs = db.query(Requirement).filter(Requirement.project_id == UUID(project_id)).all()
    # Explicitly convert to dict for frontend stability
    return [
        {
            "id": str(r.id),
            "project_id": str(r.project_id),
            "title": r.title,
            "description": r.description,
            "traceability_meta": r.traceability_meta or {},
            "estimated_hours": r.estimated_hours
        } for r in reqs
    ]

@router.get("/{project_id}/dashboard")
def get_client_dashboard(project_id: str, db: Session = Depends(get_db)):
    """
    The Single Pane of Glass for the Client.
    """
    from app.db.models import Project, Task
    
    project = db.query(Project).filter(Project.id == UUID(project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 1. Fetch Financials
    # In a real app, join with Invoices table. Here we parse the billing_info/proposal data.
    # We assume if status is ACTIVE/READY_TO_BUILD, an invoice exists.
    invoice_url = f"http://localhost:8000/api/artifacts/invoice/{project.id}" # Pseudo-link
    
    # Check for linked proposal to get billing entity if possible, else fallback
    # For now, mocking logic based on instructions
    billing_status = "PAID" if project.status in ["ACTIVE", "READY_TO_BUILD"] else "PENDING"
    
    # 2. Fetch Progress (Tasks) using relationship if exists, else query
    # Assuming relationship 'tasks' exists on Project model as defined in recent docs update plan
    # If relationship is not yet loaded/defined in ORM, we query manually:
    tasks = db.query(Task).filter(Task.project_id == UUID(project_id)).all()
    
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == "DONE"])
    progress = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0

    return {
        "project_name": project.name,
        "status": project.status,
        "maturity_score": project.maturity_score,
        "billing": {
            "entity": project.commercial_profile.get("client_name", "Valued Client"), # Fallback
            "status": billing_status,
            "invoice_download": invoice_url
        },
        "artifacts": {
            "briefcase_url": f"http://localhost:8000/api/artifacts/briefcase/{project.id}", # The Vision Doc
            "contract_hash": project.frozen_scope_hash
        },
        "execution": {
            "progress_percent": progress,
            "total_modules": total_tasks,
            "current_phase": "Construction" if project.status == "ACTIVE" else "Initialization"
        }
    }
