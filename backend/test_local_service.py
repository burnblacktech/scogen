from app.services.archetype_service import ArchetypeService
from app.db.base import SessionLocal
from app.schemas.archetype import ApplyArchetypeRequest
from uuid import UUID

def test_local():
    service = ArchetypeService()
    db = SessionLocal()
    
    project_id = "123e4567-e89b-12d3-a456-426614174000"
    archetype_id = "ARCH_CRM_STD_01"
    
    try:
        print(f"Testing hydration locally...")
        req = ApplyArchetypeRequest(
            project_id=project_id,
            archetype_id=archetype_id,
            variance_responses={}
        )
        res = service.apply_archetype_to_project(db, req)
        print(f"Success: {res.message}")
    except Exception as e:
        print(f"Error during hydration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_local()
