import json
import requests
import os
from app.ai.modeling_prompts import ENTITY_MODELING_PROMPT
from app.schemas.modeling import DomainSpec
from app.core.logging import get_logger

logger = get_logger("entity_modeler")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("AI_MODEL_NAME", "llama3:70b") # Defaulting to the model used in config, can be overridden

class EntityModeler:
    
    def synthesize_schema(self, business_type: str, user_intent: str) -> DomainSpec:
        logger.info(f"🧬 Synthesizing DNA for: {business_type}")
        
        prompt = ENTITY_MODELING_PROMPT.format(
            business_type=business_type,
            user_intent=user_intent
        )

        try:
            res = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "format": "json", # Force structured output
                    "stream": False,
                    "options": {"temperature": 0.2} # Low creativity, high precision
                },
                timeout=60
            )
            
            if res.status_code != 200:
                raise Exception(f"Ollama API Error: {res.text}")

            raw_json = res.json().get("response", "{}")
            data = json.loads(raw_json)
            
            # Validate against Pydantic to ensure structural integrity
            spec = DomainSpec(**data)
            return spec

        except Exception as e:
            logger.error(f"Modeling Failed: {e}")
            raise e
