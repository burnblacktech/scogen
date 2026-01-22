
import sys
import os
from unittest.mock import MagicMock
from uuid import uuid4
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock config
sys.modules['app.config'] = MagicMock()
mock_settings = sys.modules['app.config'].settings
mock_settings.POSTGRES_USER = 'mock'
mock_settings.POSTGRES_PASSWORD = 'mock'
mock_settings.POSTGRES_HOST = 'mock'
mock_settings.POSTGRES_PORT = 5432
mock_settings.POSTGRES_DB = 'mock'

# Mock sqlalchemy.create_engine BEFORE importing any app modules that use it
import sqlalchemy
sqlalchemy.create_engine = MagicMock()

from app.services.freeze_service import FreezeService
from app.db.models import Project, ProjectStatus, Requirement

def test_briefcase_generation():
    print("🚀 Testing Artifact Engine: Digital Briefcase Generation...")
    
    # 1. Setup Mock Data
    project_id = uuid4()
    mock_project = MagicMock(spec=Project)
    mock_project.id = project_id
    mock_project.name = "Hyperlocal Marketplace"
    mock_project.description = "A dual-role marketplace for local services."
    mock_project.status = ProjectStatus.DRAFT
    
    # Mock Requirements
    req1 = MagicMock(spec=Requirement)
    req1.title = "Dual-Role Marketplace Authentication"
    req1.description = "Manage supply-demand equilibrium."
    req1.estimated_hours = 20.0
    req1.traceability_meta = {
        "nerves": {
            "db_schema_snippet": "CREATE TABLE marketplace_users (id UUID, roles TEXT[]);",
            "forbidden_patterns": ["eval()"]
        }
    }
    req1.constraints = {"tech_stack": ["Next.js", "PostgreSQL"]}

    req2 = MagicMock(spec=Requirement)
    req2.title = "Mobile-First OTP Login"
    req2.description = "Identity verification via mobile."
    req2.estimated_hours = 15.0
    req2.traceability_meta = {
        "nerves": {
            "db_schema_snippet": "CREATE TABLE otp_codes (mobile VARCHAR(15), code VARCHAR(6));",
            "forbidden_patterns": ["plain_text_passwords"]
        }
    }
    req2.constraints = {"tech_stack": ["Firebase Auth"]}

    mock_project.requirements = [req1, req2]
    
    # 2. Mock DB Session
    mock_db = MagicMock()
    mock_db.query().filter().first.return_value = mock_project
    
    # 3. Execute Freeze
    service = FreezeService()
    result = service.freeze_project(mock_db, str(project_id))
    
    print(f"✅ Freeze Result: {result['status']}")
    print(f"📄 Artifact URL: {result['artifact_url']}")
    print(f"🔒 Document Hash: {result['hash']}")
    
    # 4. Verify File Logic
    if "file:///" in result['artifact_url']:
        file_path = result['artifact_url'].replace("file:///", "").replace("/", os.sep)
        # Handle Windows drive letters if needed
        if os.name == 'nt' and file_path.startswith(os.sep):
             # Remove leading slash on Windows if it's there
             file_path = file_path[1:]
             
        if os.path.exists(file_path):
            print(f"✅ SUCCESS: Briefcase file exists at {file_path}")
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if "Dual-Role Authentication" in content:
                    print("✅ SUCCESS: Business Narrative correctly synthesized.")
                if "CREATE TABLE marketplace_users" in content:
                    print("✅ SUCCESS: Schema snippets (The Boom) correctly injected.")
                if "CRITICAL: Implementation" in content:
                    print("✅ SUCCESS: Governance constraints (The Nerves) correctly injected.")
        else:
            print(f"❌ FAILURE: Briefcase file NOT found at {file_path}")

if __name__ == "__main__":
    test_briefcase_generation()
