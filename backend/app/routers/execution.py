"""
Execution Router - The Factory Controls
Traceability: Priority 7
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.services.execution_service import ExecutionService
from typing import List

router = APIRouter()
service = ExecutionService()

@router.post("/{project_id}/launch")
def launch_factory(project_id: str, db: Session = Depends(get_db)):
    """
    Turn the Key. Start the Factory.
    Converts a Frozen project into active Tasks.
    """
    try:
        return service.launch_project(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Factory launch failed: {str(e)}")

@router.get("/{project_id}/tasks")
def list_tasks(project_id: str, db: Session = Depends(get_db)):
    """
    The Kanban Board Data.
    Returns all tasks associated with a project.
    """
    return service.get_project_tasks(db, project_id)
