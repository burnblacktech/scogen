from app.db.base import SessionLocal
from app.db.models import Project, User
from uuid import UUID
import uuid

def ensure_demo_project():
    db = SessionLocal()
    pid = UUID("123e4567-e89b-12d3-a456-426614174000")
    
    # 1. Ensure user exists
    user = db.query(User).first()
    if not user:
        user = User(email="demo@scogen.ai", full_name="Demo User")
        db.add(user)
        db.commit()
    
    # 2. Ensure project exists
    project = db.query(Project).filter(Project.id == pid).first()
    if not project:
        project = Project(
            id=pid,
            name="Demo Project",
            owner_id=user.id,
            status="ACTIVE"
        )
        db.add(project)
        db.commit()
        print(f"✅ Created Project: {pid}")
    else:
        print(f"✅ Project Exists: {pid} (Status: {project.status})")
    
    db.close()

if __name__ == "__main__":
    ensure_demo_project()
