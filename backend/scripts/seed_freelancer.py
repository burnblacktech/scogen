from app.db.base import SessionLocal
from app.db.models import Freelancer
import uuid

def seed_freelancer():
    db = SessionLocal()
    try:
        # Check if exists
        email = "amit@scodgen.dev"
        existing = db.query(Freelancer).filter(Freelancer.email == email).first()
        if existing:
            print(f"Freelancer {existing.name} already exists.")
            return

        amit = Freelancer(
            name="Amit Sharma",
            email=email,
            hourly_rate=45.0,
            skills=["React", "Node.js", "Postgres"],
            rating=5.0,
            is_active=True
        )
        db.add(amit)
        db.commit()
        print(f"✅ Seeded Freelancer: {amit.name}")
        
    except Exception as e:
        print(f"Error seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_freelancer()
