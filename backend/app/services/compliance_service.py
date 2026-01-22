import json
import requests
import os
from app.ai.compliance_prompts import COMPLIANCE_AUDIT_PROMPT
from app.schemas.modeling import DomainSpec
from app.schemas.workflow import DomainWorkflow
from app.schemas.compliance import ComplianceReport
from app.core.logging import get_logger

logger = get_logger("compliance_service")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("AI_MODEL_NAME", "llama3:70b")

class ComplianceService:
    
    def audit_architecture(self, schema: DomainSpec, workflow: DomainWorkflow) -> ComplianceReport:
        domain = schema.domain
        logger.info(f"🛡️ Running Compliance Audit for: {domain}")
        
        # 1. Extract context for the AI
        entity_names = ", ".join([e.name for e in schema.entities])
        workflow_names = ", ".join([wf.entity_name for wf in workflow.workflows])
        
        # simple heuristic to find sensitive fields for context
        sensitive_keywords = ["password", "email", "phone", "credit", "card", "dob", "ssn", "pan", "aadhaar", "health"]
        sensitive_fields = []
        for e in schema.entities:
            for f in e.fields:
                if any(k in f.name.lower() for k in sensitive_keywords):
                    sensitive_fields.append(f"{e.name}.{f.name}")
        
        prompt = COMPLIANCE_AUDIT_PROMPT.format(
            domain=domain,
            entity_names=entity_names,
            sensitive_fields=", ".join(sensitive_fields),
            workflow_names=workflow_names
        )

        try:
            res = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.1} # Extremely strict
                },
                timeout=60
            )
            
            raw_json = res.json().get("response", "{}")
            data = json.loads(raw_json)
            return ComplianceReport(**data)

        except Exception as e:
            logger.error(f"Audit Failed: {e}")
            raise e
