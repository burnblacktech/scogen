from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.idea_service import IdeaService

router = APIRouter()
service = IdeaService()

class IdeaRequest(BaseModel):
    user_idea: str

@router.post("/generate")
def generate_memo(payload: IdeaRequest):
    """
    Generate a Venture Memo from a raw idea.
    """
    try:
        return service.generate_venture_memo(payload.user_idea)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
