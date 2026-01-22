import json
import requests
from typing import List, Dict, Any
from app.schemas.archetype import ArchetypeDefinition, ArchetypeFeature
from app.ai.prompts import VARIANCE_PROMPT_TEMPLATE
from app.core.logging import get_logger
from app.config import settings

from sqlalchemy.orm import Session
from app.db.models import ConstraintStatus
from app.services.research_service import ResearchService
from app.services.constraint_service import ConstraintService

logger = get_logger("variance_service")

class VarianceService:
    def __init__(self):
        self.research_service = ResearchService()
        self.constraint_service = ConstraintService()
    """
    Takes the Standard Chassis and mutates it based on user answers.
    This is the 'Baking' process.
    """
    
    def detect_variance(self, db: Session, user_intent: str, archetype: ArchetypeDefinition) -> List[Dict[str, Any]]:
        """
        Real-time AI analysis of the gap between Intent and Blueprint.
        Captures "Universal Constraints" for the Knowledge Harvester.
        """
        logger.info(f"🧠 Detecting Variance for Archetype: {archetype.name}")

        # 1. GET LIVE CONTEXT (Grounding)
        logger.info("🌐 Fetching live market data for grounding...")
        web_context = self.research_service.enrich_variance_context(user_intent)

        # 2. Prepare Data for AI
        feature_list = ", ".join([f.title for f in archetype.features])
        
        # 3. Build Prompt (Injected with Live Knowledge)
        prompt = VARIANCE_PROMPT_TEMPLATE.format(
            archetype_name=archetype.name,
            feature_list=feature_list,
            user_intent=user_intent
        )
        
        # Grounding Injection
        prompt += f"\n\nCONTEXT FROM WEB SEARCH (Use this to validate tech choices and compliance):\n{web_context}"

        try:
            # 3. Call The Potato Brain (Ollama)
            response = requests.post(
                f"{settings.OLLAMA_HOST}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json", # Enforce JSON mode
                    "options": {
                        "temperature": 0.2 # Low temp for strict logic
                    }
                },
                timeout=160
            )
            
            if response.status_code != 200:
                logger.error(f"AI Error: {response.text}")
                return []

            # 4. Parse AI Response
            response_json = response.json()
            raw_json = response_json.get("response", "{}")
            response_data = json.loads(raw_json)
            
            # Extract components from the new JSON format
            variances_data = response_data.get("variances", [])
            candidates = response_data.get("learned_constraints", [])

            # 5. Normalization for Variances
            if isinstance(variances_data, list):
                variance_list = variances_data
            else:
                variance_list = [variances_data] if variances_data else []

            # 6. CRYSTALLIZATION (Harvesting)
            for item in candidates:
                try:
                    # Semantic Deduplication (The Moat protection)
                    # We check if this rule already exists in the registry
                    existing = self.constraint_service.check_constraints(db, item['description'], threshold=0.9)
                    
                    if not existing:
                        logger.info(f"🧠 Crystallizing new wisdom: {item['description']}")
                        self.constraint_service.learn_constraint(
                            db,
                            category=item.get('category', 'General'),
                            description=item['description'],
                            enforcement_rule=item.get('rule', 'N/A'),
                            status=ConstraintStatus.CANDIDATE,
                            is_active=False # Candidates are inactive by default
                        )
                except Exception as e:
                    logger.warning(f"⚠️ Failed to crystallize constraint: {e}")

            logger.info(f"✅ Detected {len(variance_list)} variances and {len(candidates)} wisdom candidates.")
            return variance_list

        except Exception as e:
            logger.error(f"Variance Detection Failed: {e}")
            return []
    
    def resolve_blueprint(
        self, 
        archetype: ArchetypeDefinition, 
        user_responses: Dict[str, bool]
    ) -> List[ArchetypeFeature]:
        """
        Mutates the archetype features based on user responses.
        
        Args:
            archetype: The base archetype definition
            user_responses: Dict of variance IDs and boolean answers
            
        Returns:
            List of final features (standard + injected)
        """
        # 1. Start with Standard Features (The 80%)
        final_features = list(archetype.features)
        
        logger.info(f"🧬 Starting Neural Synthesis for {archetype.name}")

        # 2. Process Variance (The 20%)
        for variance in archetype.variance_points:
            user_choice = user_responses.get(variance.id, False) # Default to No
            
            if user_choice:
                logger.info(f"⚡ Injecting Variance: {variance.id} triggered")
                # Logic: In a real system, we fetch the module definition from DB/File
                # For MVP, we simulate the module injection
                for trigger_id in variance.trigger_if_yes:
                    # Check if feature already exists to avoid duplicates
                    if any(f.id == trigger_id for f in final_features):
                        continue
                        
                    # Simulation: Creating a feature on the fly
                    # In production, this would use ArchetypeService.get_module_by_id(trigger_id)
                    logger.info(f"➕ Synthesizing module: {trigger_id}")
                    
                    mock_feature = ArchetypeFeature(
                        id=trigger_id,
                        category="Advanced",
                        title=f"Custom Module: {trigger_id}",
                        description="Dynamically synthesized based on client variance protocol.",
                        standard_hours=variance.cost_impact, # For simplification
                        complexity="MEDIUM",
                        acceptance_criteria="System functions as defined in neural blueprint.",
                        technical_mapping={
                            "module_namespace": trigger_id.lower(),
                            "required_files": [],
                            "test_coverage_threshold": 90,
                            "forbidden_patterns": ["eval()"]
                        }
                    )
                    final_features.append(mock_feature)
            else:
                logger.info(f"⚖️ Skipping Variance: {variance.id} (Not requested)")

        return final_features
