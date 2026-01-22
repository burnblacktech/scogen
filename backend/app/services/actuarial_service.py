import os
import requests
from app.schemas.modeling import DomainSpec
from app.schemas.workflow import DomainWorkflow
from app.schemas.pricing_model import ProjectEstimate, CostBreakdown
from app.core.logging import get_logger

logger = get_logger("actuarial_service")

# CONSTANTS (The Scogen Index)
HOURS_PER_ENTITY = 8.0       # CRUD + Testing
HOURS_PER_FIELD = 0.5        # Validation logic
HOURS_PER_TRANSITION = 4.0   # State logic
HOURS_PER_SIDE_EFFECT = 6.0  # Integration overhead
HOURLY_RATE_INR = 2500.0

class ActuarialService:
    
    def calculate_estimate(self, schema: DomainSpec, workflow: DomainWorkflow) -> ProjectEstimate:
        logger.info(f"💰 Calculating Actuarial Price for: {schema.domain}")
        
        breakdown = []
        
        # 1. DATABASE LAYER (Deterministic)
        entity_count = len(schema.entities)
        field_count = sum(len(e.fields) for e in schema.entities)
        
        db_hours = (entity_count * HOURS_PER_ENTITY) + (field_count * HOURS_PER_FIELD)
        breakdown.append(CostBreakdown(
            category="Database & Schema",
            item_count=entity_count,
            base_hours=db_hours,
            risk_factor=1.0,
            total_hours=db_hours
        ))

        # 2. LOGIC LAYER (Deterministic)
        transition_count = 0
        side_effect_count = 0
        
        for wf in workflow.workflows:
            transition_count += len(wf.transitions)
            for t in wf.transitions:
                side_effect_count += len(t.side_effects)
        
        logic_hours = (transition_count * HOURS_PER_TRANSITION) + (side_effect_count * HOURS_PER_SIDE_EFFECT)
        breakdown.append(CostBreakdown(
            category="Workflow & Logic",
            item_count=transition_count,
            base_hours=logic_hours,
            risk_factor=1.2, # Logic is riskier than DB
            total_hours=logic_hours * 1.2
        ))

        # 3. DOMAIN RISK (AI Assessment)
        # We ask AI: "Is 'Pharmacy' high risk?"
        risk_multiplier, risk_label = self._get_ai_risk_score(schema.domain)
        
        total_raw_hours = db_hours + logic_hours
        final_hours = total_raw_hours * risk_multiplier
        
        # 4. Timeline (Assume 2 devs working 30 effective hours/week)
        timeline_weeks = max(2, int(final_hours / 60))

        return ProjectEstimate(
            total_hours=round(final_hours, 1),
            estimated_cost_inr=round(final_hours * HOURLY_RATE_INR, 0),
            timeline_weeks=timeline_weeks,
            risk_score=risk_label,
            breakdown=breakdown
        )

    def _get_ai_risk_score(self, domain: str):
        # Fallback logic for Potato Mode if AI fails
        # In prod: Call Ollama with "Assess regulatory/tech risk of {domain} on scale 1.0 to 2.0"
        
        # Simple keyword heuristics for MVP
        domain_lower = domain.lower()
        if "crypto" in domain_lower or "bank" in domain_lower or "health" in domain_lower:
            return 1.5, "HIGH (Compliance Risk)"
        if "marketplace" in domain_lower:
            return 1.3, "MEDIUM (Coordination Risk)"
        return 1.1, "LOW (Standard)"
