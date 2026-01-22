from typing import Dict, Any, List
from app.core.logging import get_logger

logger = get_logger("artifact_service")

class ArtifactService:
    def __init__(self):
        # We don't load the template here to keep service stateless, 
        # but helper methods prepare the data for the template.
        pass

    def generate_executive_narrative(self, project_name: str, requirements: List[Dict[str, Any]]) -> str:
        """
        Synthesizes the 'Business Value' narrative based on selected modules.
        """
        logger.info(f"✍️ Generating Executive Narrative for project: {project_name}")
        narrative = [
            f"**Strategic Initiative:** Deployment of the {project_name} platform to capture high-intent market demand.",
            "**Architecture Strategy:** Selected a Modular Monolith approach to ensure data sovereignty and rapid scalability."
        ]
        
        # Dynamic Injection based on tags/titles
        has_otp = any("OTP" in r.get('title', '') for r in requirements)
        has_real_estate = any("Real Estate" in r.get('title', '') for r in requirements)
        has_marketplace = any("Marketplace" in r.get('title', '') for r in requirements)

        if has_marketplace:
            narrative.append(" **Marketplace Dynamics:** The system implements a Dual-Role Authentication flow to manage the supply-demand equilibrium between Service Providers and Customers.")
        
        if has_real_estate:
            narrative.append(" **Sector Specificity:** Data models have been hardened to support complex Property attributes (BHK, Carpet Area, Location Vectors) ensuring high-fidelity lead matching.")

        if has_otp:
            narrative.append(" **Security & Compliance:** To mitigate identity fraud in the Indian market, a strict Mobile-First OTP verification layer has been architected into the core auth flow.")

        return "\n\n".join(narrative)

    def compile_technical_spec(self, requirements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Extracts the 'Boom' columns (Schema) and 'Nerves' (Constraints).
        """
        logger.info("⚡ Compiling Technical Specification from requirements...")
        schema_lines = []
        constraints = []
        stack_components = set()

        for req in requirements:
            # 1. Dig into the Metadata
            # Note: Requirements from SQLAlchemy models might need dictionary access or attribute access
            # The FreezeService passes them as dicts
            meta = req.get('traceability_meta', {}) or {}
            # In our current schema, it might be nested differently or just 'technical_mapping'
            # Let's align with what was provided in the prompt but be defensive
            nerves = meta.get('nerves', {}) or req.get('technical_mapping', {})
            
            # 2. Extract Stack Info
            if 'tech_stack' in req.get('constraints', {}):
                for tech in req['constraints']['tech_stack']:
                    stack_components.add(tech)

            # 3. Extract Schema Snippets (The Boom)
            if isinstance(nerves, dict) and 'db_schema_snippet' in nerves:
                schema_lines.append(f"-- Module: {req.get('title', 'Unknown')}")
                schema_lines.append(nerves['db_schema_snippet'])
                schema_lines.append("")

            # 4. Extract Forbidden Patterns (The Nerves)
            if isinstance(nerves, dict) and 'forbidden_patterns' in nerves:
                patterns = ", ".join(nerves['forbidden_patterns'])
                constraints.append(f"CRITICAL: Implementation of '{req.get('title', 'Unknown')}' MUST REJECT usage of: [{patterns}]")

        return {
            "schema_block": "\n".join(schema_lines) if schema_lines else "-- No custom schema injections defined for standard modules.",
            "governance_list": constraints,
            "stack_summary": ", ".join(list(stack_components)) or "Standard Scogen MERN/T3 Stack"
        }
