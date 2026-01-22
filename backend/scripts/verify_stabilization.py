
import sys
import os
import tempfile
import logging
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock config and DB if needed to avoid startup side effects
# But we want to test real logic, so we only mock what is strictly necessary to avoid connection errors
sys.modules['app.config'] = MagicMock()
mock_settings = sys.modules['app.config'].settings
mock_settings.POSTGRES_USER = 'mock'
mock_settings.EMBEDDING_MODEL = 'nomic-embed-text'
mock_settings.EMBEDDING_DIM = 768

from app.services.airlock_service import AirlockService
from app.services.variance_service import VarianceService
from app.schemas.archetype import ArchetypeDefinition, ArchetypeFeature
from app.core.logging import get_logger

logger = get_logger("verify_stabilization")

def test_airlock_paths():
    logger.info("Verifying AirlockService pathing...")
    airlock = AirlockService()
    
    # Check if workspace_dir is in the temp directory
    temp_dir = tempfile.gettempdir()
    logger.info(f"System temp dir: {temp_dir}")
    logger.info(f"Airlock workspace dir: {airlock.workspace_dir}")
    
    if airlock.workspace_dir.startswith(temp_dir):
        logger.info("✅ SUCCESS: AirlockService is using the system temp directory.")
    else:
        logger.error(f"❌ FAILURE: AirlockService workspace ({airlock.workspace_dir}) is NOT in temp directory ({temp_dir})")

def test_variance_synthesis():
    logger.info("Verifying VarianceService synthesis...")
    variance_service = VarianceService()
    
    from app.schemas.archetype import VariancePoint
    base_archetype = ArchetypeDefinition(
        id="CRM_01",
        name="Standard CRM",
        version="1.0.0",
        description="A basic CRM",
        base_hours=100.0,
        tech_stack=["Python", "FastAPI"],
        features=[
            ArchetypeFeature(
                id="AUTH_01", 
                category="Security", 
                title="Basic Auth", 
                description="Email/Password auth",
                standard_hours=10.0,
                complexity="LOW",
                acceptance_criteria="User can login"
            )
        ],
        industry_verticals=["SaaS"],
        variance_points=[
            VariancePoint(id="VAR_OTP", question="Add OTP?", trigger_if_yes=["MOD_AUTH_OTP_01"], cost_impact=5.0)
        ]
    )
    
    # Scenario: User wants OTP (VAR_OTP=True)
    user_responses = {"VAR_OTP": True}
    mutated_features = variance_service.resolve_blueprint(base_archetype, user_responses)
    
    feature_ids = [f.id for f in mutated_features]
    logger.info(f"Final features: {feature_ids}")
    
    if "MOD_AUTH_OTP_01" in feature_ids:
        logger.info("✅ SUCCESS: VarianceService correctly injected the OTP module.")
    else:
        logger.error("❌ FAILURE: VarianceService failed to inject the OTP module.")

if __name__ == "__main__":
    try:
        test_airlock_paths()
        print("-" * 30)
        test_variance_synthesis()
    except Exception as e:
        logger.exception(f"Verification failed with error: {e}")
