import json
import requests
import os
from app.ai.workflow_prompts import WORKFLOW_MODELING_PROMPT
from app.schemas.workflow import DomainWorkflow
from app.schemas.modeling import DomainSpec
from app.core.logging import get_logger

logger = get_logger("workflow_modeler")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("AI_MODEL_NAME", "llama3:70b") # Default to consistent model

class WorkflowModeler:
    
    def synthesize_workflow(self, domain_spec: DomainSpec) -> DomainWorkflow:
        business_type = domain_spec.domain
        # Extract entity names to guide the AI
        entity_list = ", ".join([e.name for e in domain_spec.entities])
        
        logger.info(f"⚡ Synthesizing Workflows for: {business_type} ({entity_list})")
        
        prompt = WORKFLOW_MODELING_PROMPT.format(
            business_type=business_type,
            entity_list=entity_list
        )

        try:
            res = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.2}
                },
                timeout=60
            )
            
            raw_json = res.json().get("response", "{}")
            data = json.loads(raw_json)
            return DomainWorkflow(**data)

        except Exception as e:
            logger.error(f"Workflow Modeling Failed: {e}")
            raise e
