"""
Quick script to create a test project for archetype hydration testing
"""
from app.db.base import SessionLocal
from app.db.models import User, Project, ProjectStatus

def create_test_project():
    db = SessionLocal()
    
    try:
        # Create test user if not exists
        user = db.query(User).filter(User.email == "test@scogen.com").first()
        if not user:
            user = User(
                email="test@scogen.com",
                full_name="Test User",
                role="OWNER"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ Created test user: {user.id}")
        else:
            print(f"✅ Using existing user: {user.id}")
        
        # Create test project
        project = Project(
            owner_id=user.id,
            name="Test CRM Project",
            description="Test project for archetype hydration",
            status=ProjectStatus.DRAFT,
            maturity_score=75
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        print(f"✅ Created test project: {project.id}")
        print(f"\nUse this project_id for testing:")
        print(f'"{project.id}"')
        
        return str(project.id)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_project()
