from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.services.proposal_service import ProposalService
from pydantic import BaseModel

router = APIRouter()
service = ProposalService()

# Schema for creating
class CreateProposalRequest(BaseModel):
    project_id: str
    base_price: float
    rush_price: float

@router.post("/create")
def generate_link(payload: CreateProposalRequest, db: Session = Depends(get_db)):
    """
    Admin generates the link from the Margin Mixer.
    """
    try:
        return service.create_proposal(db, payload.project_id, payload.base_price, payload.rush_price)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{token}")
def view_deal_room(token: str, db: Session = Depends(get_db)):
    """
    Public endpoint for the Client UI.
    """
    try:
        return service.get_public_proposal(db, token)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
class AcceptRequest(BaseModel):
    is_rush: bool

@router.post("/{token}/accept")
def accept_deal(token: str, payload: AcceptRequest, db: Session = Depends(get_db)):
    """
    Client clicks the button.
    """
    try:
        return service.accept_proposal(db, token, payload.is_rush)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
