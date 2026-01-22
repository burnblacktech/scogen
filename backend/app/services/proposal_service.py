import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.models import Proposal, Project, ProjectStatus
from app.services.invoice_service import InvoiceService

class ProposalService:
    def __init__(self):
        self.invoice_service = InvoiceService()
    
    def create_proposal(self, db: Session, project_id: str, base_price: float, rush_price: float):
        """
        Admin Action: Generate a Deal Room link.
        """
        # Generate a secure random token
        token = uuid.uuid4().hex
        
        proposal = Proposal(
            project_id=project_id,
            access_token=token,
            # 7 Day Expiry creates natural urgency
            expires_at=datetime.utcnow() + timedelta(days=7),
            base_price=base_price,
            rush_price=rush_price,
            status="OPEN"
        )
        
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        
        # Return the public link
        return {
            "proposal_id": str(proposal.id),
            "access_token": token,
            "public_url": f"http://localhost:3000/proposal/{token}"
        }

    def get_public_proposal(self, db: Session, token: str):
        """
        Public Action: Client viewing the Deal Room.
        """
        proposal = db.query(Proposal).filter(Proposal.access_token == token).first()
        
        if not proposal:
            raise ValueError("Invalid Proposal Link")
            
        if datetime.utcnow() > proposal.expires_at:
            raise ValueError("This Proposal has expired.")
            
        # Fetch Project Name for context
        project = db.query(Project).filter(Project.id == proposal.project_id).first()
        project_name = project.name if project else "Confidential Project"

        return {
            "project_id": str(project.id),
            "project_name": project_name,
            "base_price": proposal.base_price,
            "rush_price": proposal.rush_price,
            "expires_at": proposal.expires_at,
            "status": proposal.status
        }

    def accept_proposal(self, db: Session, token: str, selected_rush: bool):
        """
        The Handshake: Client accepts the terms.
        """
        proposal = db.query(Proposal).filter(Proposal.access_token == token).first()
        if not proposal or proposal.status != "OPEN":
            raise ValueError("Proposal invalid or already closed.")

        # 1. Lock the Price
        final_price = proposal.rush_price if selected_rush else proposal.base_price
        
        # 2. Update Proposal
        proposal.status = "ACCEPTED"
        proposal.client_ip = "127.0.0.1" # Capture real IP in prod
        
        # 3. Update Project State
        project = db.query(Project).filter(Project.id == proposal.project_id).first()
        project.status = ProjectStatus.READY_TO_BUILD
        
        # 4. Generate Invoice
        invoice_url = self.invoice_service.generate_pro_forma(
            project.name, final_price, selected_rush
        )
        
        db.commit()
        
        return {
            "status": "ACCEPTED",
            "project_id": str(project.id),
            "invoice_url": invoice_url,
            "message": "Project activated. Invoice generated."
        }
