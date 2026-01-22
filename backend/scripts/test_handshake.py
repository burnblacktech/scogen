import sys
import os
import uuid
import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock config to avoid DotEnv/CORS issues
from unittest.mock import MagicMock
sys.modules['app.config'] = MagicMock()
mock_settings = sys.modules['app.config'].settings
mock_settings.CORS_ORIGINS = ["*"]

# Mock sqlalchemy
import sqlalchemy
sqlalchemy.create_engine = MagicMock()

from app.services.proposal_service import ProposalService
from app.db.models import Proposal, Project, ProjectStatus

def test_handshake_protocol():
    print("🤝 Testing Phase 6: The Handshake Protocol...")
    
    # Mock DB Session
    db = MagicMock()
    
    # 1. Setup Test Data
    project_id = uuid.uuid4()
    token = "test_handshake_token"
    
    mock_project = Project(
        id=project_id, 
        name="Handshake Project", 
        status=ProjectStatus.FROZEN
    )
    mock_proposal = Proposal(
        project_id=project_id,
        access_token=token,
        base_price=1000000.0,
        rush_price=2000000.0,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7),
        status="OPEN"
    )
    
    # Setup query return values
    # First query is for proposal, second is for project
    db.query().filter().first.side_effect = [mock_proposal, mock_project]
    
    service = ProposalService()
    
    # 2. Execute Handshake
    print("\n[Action] Client Accepts Proposal (RUSH enabled)...")
    result = service.accept_proposal(db, token, selected_rush=True)
    
    # 3. Verify
    print(f"📦 Result Status: {result['status']}")
    print(f"📦 Invoice URL: {result['invoice_url']}")
    
    assert result['status'] == "ACCEPTED"
    assert mock_proposal.status == "ACCEPTED"
    assert mock_project.status == ProjectStatus.READY_TO_BUILD
    
    # Verify Invoice File exists
    invoice_path = os.path.join(os.getcwd(), "backend", "temp", f"INVOICE_{mock_project.name.replace(' ', '_')}.html")
    assert os.path.exists(invoice_path), f"Invoice file not found at {invoice_path}"
    
    print("\n✅ Handshake Protocol Verified!")
    print(f"📄 Pro-Forma Invoice generated at: {invoice_path}")

if __name__ == "__main__":
    test_handshake_protocol()
