from sqlalchemy.orm import Session
from uuid import UUID
from app.db.models import Project, Task, Freelancer, TaskStatus
import uuid

class AdminService:
    
    def mark_invoice_paid(self, db: Session, project_id: str):
        """
        Unblocks the project.
        """
        project = db.query(Project).filter(Project.id == UUID(project_id)).first()
        if not project:
            raise ValueError("Project not found")

        # Mocking payment status field Update - assuming field exists or using commercial profile
        # In models.py we have commercial_profile JSONB. Adding explicit status or updating profile.
        # User instruction said: project.payment_status = "PAID". 
        # But Project model doesn't have payment_status column in schema doc, it has commercial_profile.
        # However, Phase 7 dashboard used billing_info.status mocked from project.status
        # Let's check models.py again. Project has status (DRAFT, ACTIVE etc).
        # We will assume payment unblocks 'READY_TO_BUILD' to 'ACTIVE'.
        
        # We will also add a key to commercial_profile for explicit tracking
        current_profile = dict(project.commercial_profile or {})
        current_profile["payment_status"] = "PAID"
        project.commercial_profile = current_profile
        
        if project.status == "READY_TO_BUILD":
            project.status = "ACTIVE"
        
        # Ensuring standard status update to ACTIVE if it was pending payment
        if project.status != "ACTIVE":
             project.status = "ACTIVE"
            
        db.commit()
        return {"status": "PAID", "project": project.name}

    def add_freelancer(self, db: Session, name: str, email: str, rate: float, skills: list):
        """
        Onboard a worker.
        """
        worker = Freelancer(name=name, email=email, hourly_rate=rate, skills=skills)
        db.add(worker)
        db.commit()
        return worker

    def assign_task(self, db: Session, task_id: str, freelancer_id: str):
        """
        The Dispatch. Links a Task to a Human.
        """
        task = db.query(Task).filter(Task.id == UUID(task_id)).first()
        worker = db.query(Freelancer).filter(Freelancer.id == UUID(freelancer_id)).first()
        
        if not task or not worker:
            raise ValueError("Task or Worker not found")
        
        task.assigned_to_id = worker.id
        task.status = TaskStatus.ASSIGNED
        # In a real app: Send Email with Airlock Link here.
        
        db.commit()
        return {"task": str(task.id), "assigned_to": worker.name}
        
    def get_ops_overview(self, db: Session):
        """
        The God View Data.
        """
        # 1. Money In Waiting
        # Pending payment projects
        projects = db.query(Project).all()
        pending_invoices = [
            p for p in projects 
            if p.status == "READY_TO_BUILD" or (p.commercial_profile and p.commercial_profile.get("payment_status") != "PAID")
        ]
        
        # 2. Work In Waiting (The Queue)
        # Unassigned tasks, ideally for active projects
        unassigned_tasks = db.query(Task).filter(Task.status == TaskStatus.PENDING).all()
        
        # 3. The Bench
        workers = db.query(Freelancer).filter(Freelancer.is_active == True).all()
        
        return {
            "invoices": pending_invoices,
            "queue": unassigned_tasks,
            "bench": workers
        }
