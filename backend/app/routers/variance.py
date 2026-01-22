from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.services.variance_service import VarianceService
from app.services.archetype_service import ArchetypeService
from app.core.logging import get_logger

logger = get_logger("variance_router")
router = APIRouter()
variance_service = VarianceService()
archetype_service = ArchetypeService()

class DetectRequest(BaseModel):
    archetype_id: str
    user_intent: str

@router.post("/detect")
def detect_dynamic_variance(payload: DetectRequest, db: Session = Depends(get_db)):
    """
    Asks the AI to find gaps between User Intent and the selected Blueprint.
    """
    logger.info(f"📡 API Request: Detect Variance for {payload.archetype_id}")
    
    # 1. Load the Blueprint
    archetype = archetype_service.get_archetype_by_id(payload.archetype_id)
    if not archetype:
        logger.warning(f"⚠️ Archetype {payload.archetype_id} not found")
        raise HTTPException(status_code=404, detail="Archetype not found")

    # 2. Run Analysis
    try:
        variances = variance_service.detect_variance(db, payload.user_intent, archetype)
        return {"status": "SUCCESS", "variances": variances}
    except Exception as e:
        logger.error(f"❌ Adaptive Variance Detection Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
