from pydantic import BaseModel, Field
from typing import List, Literal

class RiskFactor(BaseModel):
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    description: str
    mitigation_strategy: str

class Regulation(BaseModel):
    name: str # e.g. "GDPR", "HIPAA", "RBI-2025"
    applicability: str # Why it applies (e.g. "Storing Patient Data")
    mandatory_controls: List[str] # e.g. ["Data Encryption at Rest", "Audit Logs"]

class ComplianceReport(BaseModel):
    overall_risk_score: int # 0-100
    regulations: List[Regulation]
    identified_risks: List[RiskFactor]
