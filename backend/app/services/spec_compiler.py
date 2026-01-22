from app.services.entity_modeler import EntityModeler
from app.services.workflow_modeler import WorkflowModeler
from app.services.actuarial_service import ActuarialService
from app.services.compliance_service import ComplianceService
from app.schemas.master_spec import MasterSpec, SpecMetadata
from app.core.logging import get_logger

logger = get_logger("spec_compiler")

class SpecCompiler:
    def __init__(self):
        self.entity_modeler = EntityModeler()
        self.workflow_modeler = WorkflowModeler()
        self.compliance_service = ComplianceService()
        self.pricing_service = ActuarialService()

    def compile_specification(self, project_name: str, business_type: str, user_intent: str) -> MasterSpec:
        logger.info(f"🏗️ Compiling Master Spec for: {project_name}")

        # 1. CORE 1: DNA (Entities)
        logger.info("   > [1/4] Synthesizing DNA...")
        dna = self.entity_modeler.synthesize_schema(business_type, user_intent)

        # 2. CORE 2: PULSE (Workflows)
        logger.info("   > [2/4] Defining Pulse...")
        pulse = self.workflow_modeler.synthesize_workflow(dna)

        # 3. CORE 4: SHIELD (Compliance)
        # Note: We run this before pricing because compliance adds cost/risk
        logger.info("   > [3/4] Raising Shield...")
        shield = self.compliance_service.audit_architecture(dna, pulse)

        # 4. CORE 3: VALUE (Pricing)
        # In a real app, we might adjust the price based on 'shield.overall_risk_score'
        logger.info("   > [4/4] Calculating Value...")
        value = self.pricing_service.calculate_estimate(dna, pulse)

        # 5. ASSEMBLE
        return MasterSpec(
            metadata=SpecMetadata(project_name=project_name, user_intent=user_intent),
            dna=dna,
            pulse=pulse,
            shield=shield,
            value=value
        )
