import sys
import os
import uuid

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock config to avoid DotEnv issues
from unittest.mock import MagicMock
sys.modules['app.config'] = MagicMock()
mock_settings = sys.modules['app.config'].settings
mock_settings.CORS_ORIGINS = ["*"]

# Mock sqlalchemy before any imports
import sqlalchemy
sqlalchemy.create_engine = MagicMock()

from app.services.proposal_service import ProposalService
from app.db.models import Proposal, Project

def test_deal_room_flow():
    print("🤝 Testing Phase 5: The Deal Room...")
    
    # Mock DB Session
    from unittest.mock import MagicMock
    db = MagicMock()
    
    # Mock return for project name lookup
    mock_project = Project(id=uuid.uuid4(), name="The Crypto Citadel")
    db.query().filter().first.return_value = mock_project
    
    service = ProposalService()
    
    # 1. Create Proposal
    print("\n[Step 1] Creating Proposal...")
    project_id = str(uuid.uuid4())
    base_price = 1000000.0 # 10L
    rush_price = 2000000.0 # 20L
    
    result = service.create_proposal(db, project_id, base_price, rush_price)
    token = result['access_token']
    
    print(f"✅ Secure Token Generated: {token}")
    print(f"✅ Public URL: {result['public_url']}")
    
    # Verify DB commit
    assert db.add.called, "Proposal not added to DB"
    assert db.commit.called, "DB not committed"
    
    # 2. View Proposal (Public Mode)
    print("\n[Step 2] Retrieving Public Proposal...")
    
    # Mock the query for get_public_proposal
    mock_proposal = Proposal(
        project_id=project_id,
        access_token=token,
        base_price=base_price,
        rush_price=rush_price,
        expires_at=None, # Not checked in this mock simple test
        status="OPEN"
    )
    # Reset mock and set return for the specific query
    db.query().filter().first.side_effect = [mock_proposal, mock_project]
    
    import datetime
    mock_proposal.expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)

    public_data = service.get_public_proposal(db, token)
    
    print(f"📍 Project: {public_data['project_name']}")
    print(f"📍 Base Price: ₹{public_data['base_price']:,.2f}")
    print(f"📍 Rush Price: ₹{public_data['rush_price']:,.2f}")
    print(f"📍 Status: {public_data['status']}")
    
    assert public_data['base_price'] == 1000000.0
    assert public_data['rush_price'] == 2000000.0
    print("\n✅ Verification Successful: Proposal created and retrieved.")

if __name__ == "__main__":
    test_deal_room_flow()
