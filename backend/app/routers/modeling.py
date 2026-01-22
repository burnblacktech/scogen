from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.entity_modeler import EntityModeler
from app.services.workflow_modeler import WorkflowModeler
from app.services.actuarial_service import ActuarialService
from app.services.compliance_service import ComplianceService
from app.services.spec_compiler import SpecCompiler
from app.schemas.modeling import DomainSpec
from app.schemas.workflow import DomainWorkflow
from app.schemas.pricing_model import ProjectEstimate
from app.schemas.compliance import ComplianceReport
from app.schemas.master_spec import MasterSpec

router = APIRouter()
modeler = EntityModeler()
workflow_service = WorkflowModeler()
pricing_service = ActuarialService()
audit_service = ComplianceService()
compiler = SpecCompiler()

class ModelingRequest(BaseModel):
    business_type: str # e.g. "Pharmacy"
    context: str # e.g. "Need to track batch numbers and schedule H1 drug reports"

class EstimateRequest(BaseModel):
    schema_spec: DomainSpec
    workflow_spec: DomainWorkflow

class AuditRequest(BaseModel):
    schema_spec: DomainSpec
    workflow_spec: DomainWorkflow

class CompileRequest(BaseModel):
    project_name: str
    business_type: str
    user_intent: str

@router.post("/generate-schema")
def generate_schema(payload: ModelingRequest):
    """
    Generates a Business-Specific Database Schema (The DNA).
    """
    try:
        return modeler.synthesize_schema(payload.business_type, payload.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-workflow")
def generate_workflow(spec: DomainSpec):
    """
    Takes a Schema (DNA) and generates the Logic (Pulse).
    """
    try:
        return workflow_service.synthesize_workflow(spec)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/estimate-cost")
def estimate_project_cost(payload: EstimateRequest):
    """
    Calculates the Price Tag based on the Architecture Complexity.
    """
    try:
        return pricing_service.calculate_estimate(payload.schema_spec, payload.workflow_spec)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audit-compliance")
def audit_project_architecture(payload: AuditRequest):
    """
    Scans the architecture for Legal and Security risks.
    """
    try:
        return audit_service.audit_architecture(payload.schema_spec, payload.workflow_spec)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compile-master-spec")
def compile_master_spec(payload: CompileRequest):
    """
    The 'One-Click' Architecture Generator.
    Runs the full Quad-Core pipeline and returns the Master JSON.
    """
    try:
        return compiler.compile_specification(
            payload.project_name, 
            payload.business_type, 
            payload.user_intent
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
