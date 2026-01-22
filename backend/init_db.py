"""
Database Initialization Script
Creates all tables and enables required PostgreSQL extensions

Run this script to initialize the database:
    python init_db.py

This is a one-time setup script. For migrations, use Alembic.
"""
from app.db.base import engine, Base
from app.db.models import User, Project, Requirement, ConstraintRegistry, AuditLog
from sqlalchemy import text


def init_db():
    """Initialize database with extensions and tables"""
    print("⏳ Connecting to Database...")
    
    try:
        # 1. Ensure the Vector extension exists
        with engine.connect() as connection:
            print("📦 Enabling pgvector extension...")
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            connection.commit()
            print("✅ pgvector extension enabled.")

        # 2. Create Tables
        print("🏗️  Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        print("\n✅ Database Initialization Complete!")
        print("\n📊 Tables Created:")
        print("   ├── users (Identity management)")
        print("   ├── projects (The Vault)")
        print("   ├── requirements (The Atoms)")
        print("   ├── constraint_registry (The Moat)")
        print("   └── audit_logs (The Evidence)")
        
        print("\n🔍 Verifying tables...")
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result]
            print(f"   Found {len(tables)} tables: {', '.join(tables)}")

    except Exception as e:
        print(f"\n❌ Database Initialization Failed!")
        print(f"   Error: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Ensure Docker containers are running: docker compose ps")
        print("   2. Check PostgreSQL connection in .env file")
        print("   3. Verify port 5433 is accessible: docker logs scogen-postgres")
        raise


if __name__ == "__main__":
    init_db()
