from app.db.base import SessionLocal
from app.db.models import Requirement, Project
from uuid import UUID

def check_one_pid():
    db = SessionLocal()
    pid = UUID("123e4567-e89b-12d3-a456-426614174000")
    
    # Check Project
    p = db.query(Project).filter(Project.id == pid).first()
    if p:
        print(f"✅ Found Project: {p.name}")
    else:
        print(f"❌ Project {pid} NOT in DB")
        
    # Check Requirements for this Project
    reqs = db.query(Requirement).filter(Requirement.project_id == pid).all()
    print(f"📊 Project {pid} has {len(reqs)} requirements.")
    for r in reqs:
        print(f"  - {r.title}")
        
    # Check ALL Requirements to see if they are accidentally linked to another PID
    all_reqs = db.query(Requirement).all()
    print(f"🌍 Total requirements in DB: {len(all_reqs)}")
    pids = set(str(r.project_id) for r in all_reqs)
    print(f"📡 Found requirements for PIDs: {pids}")
    
    db.close()

if __name__ == "__main__":
    check_one_pid()
