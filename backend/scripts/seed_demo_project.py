from app.db.base import SessionLocal
from app.db.models import Project, User, ProjectStatus
from uuid import UUID
from datetime import datetime

def seed_demo_project():
    db = SessionLocal()
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    project_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    
    # 1. Ensure User exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print(f"👤 Creating demo owner: {user_id}")
        user = User(
            id=user_id,
            email="mr.x@burnblack.tech",
            full_name="Mr. X",
            role="OWNER"
        )
        db.add(user)
        db.commit()
    
    # 2. Ensure Project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        print(f"🌱 Creating demo project: {project_id}")
        demo_project = Project(
            id=project_id,
            owner_id=user_id,
            name="Demo CRM Project",
            description="A demo project for Agency Operating System testing.",
            status=ProjectStatus.DRAFT,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(demo_project)
        db.commit()
        print("✅ Demo project created.")
    else:
        print("✅ Demo project already exists.")
    db.close()

if __name__ == "__main__":
    seed_demo_project()
