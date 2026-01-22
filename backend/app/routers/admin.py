from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.services.admin_service import AdminService
from pydantic import BaseModel
from typing import List

router = APIRouter()
service = AdminService()

class FreelancerRequest(BaseModel):
    name: str
    email: str
    hourly_rate: float
    skills: List[str]

class AssignRequest(BaseModel):
    task_id: str
    freelancer_id: str

@router.get("/overview")
def ops_overview(db: Session = Depends(get_db)):
    """ Get Invoices, Queue, Bench """
    return service.get_ops_overview(db)

@router.get("/pulse")
def system_pulse(db: Session = Depends(get_db)):
    """ Check System Health """
    from app.services.health_service import HealthService
    return HealthService().check_vitals(db)

# Keep /health for legacy/other checks if needed, or redirect
@router.get("/health")
def check_system_health(db: Session = Depends(get_db)):
    return system_pulse(db)

@router.post("/projects/{project_id}/pay")
def mark_paid(project_id: str, db: Session = Depends(get_db)):
    """ Unlock the Factory """
    try:
        return service.mark_invoice_paid(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/tasks/assign")
def dispatch_task(payload: AssignRequest, db: Session = Depends(get_db)):
    """ Assign Worker """
    try:
        return service.assign_task(db, payload.task_id, payload.freelancer_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

