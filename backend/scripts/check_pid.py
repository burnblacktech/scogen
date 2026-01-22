from app.db.base import SessionLocal
from app.db.models import Project, Requirement
from uuid import UUID

def check_db():
    db = SessionLocal()
    pid = UUID("123e4567-e89b-12d3-a456-426614174000")
    project = db.query(Project).filter(Project.id == pid).first()
    
    if project:
        print(f"✅ Project Found: {project.name} (Status: {project.status})")
        req_count = db.query(Requirement).filter(Requirement.project_id == pid).count()
        print(f"📊 Requirements Count: {req_count}")
        
        reqs = db.query(Requirement).filter(Requirement.project_id == pid).all()
        for i, r in enumerate(reqs[:5]):
            print(f"  - [{i}] {r.title}")
    else:
        print(f"❌ Project NOT FOUND: {pid}")
    
    db.close()

if __name__ == "__main__":
    check_db()
