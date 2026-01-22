from app.db.base import SessionLocal
from app.db.models import Requirement, Project, Task, AuditLog
from uuid import UUID

def purge_demo():
    db = SessionLocal()
    pid = UUID("123e4567-e89b-12d3-a456-426614174000")
    
    # 1. Clear tasks and requirements
    db.query(Task).filter(Task.project_id == pid).delete()
    db.query(Requirement).filter(Requirement.project_id == pid).delete()
    
    # 2. Reset project to ACTIVE
    project = db.query(Project).filter(Project.id == pid).first()
    if project:
        project.status = "ACTIVE"
        project.frozen_scope_hash = None
        project.maturity_score = 0
        print(f"✅ Reset Project: {pid}")
    
    db.commit()
    db.close()

if __name__ == "__main__":
    purge_demo()
