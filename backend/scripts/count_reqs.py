from app.db.base import SessionLocal
from app.db.models import Requirement
from uuid import UUID

def check_requirements():
    db = SessionLocal()
    pid = UUID("123e4567-e89b-12d3-a456-426614174000")
    count = db.query(Requirement).filter(Requirement.project_id == pid).count()
    print(f"📊 Project {pid} has {count} requirements.")
    
    # Also check if any requirements exist at all (for any project)
    total = db.query(Requirement).count()
    print(f"🌍 Total requirements in DB: {total}")
    
    db.close()

if __name__ == "__main__":
    check_requirements()
