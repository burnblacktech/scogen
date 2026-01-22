"""
Archetype Schemas - Data Contracts for RFC Assets
Validates archetype JSON files before database insertion
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# --- The "Body" (Where the code lives) ---
class AssetSource(BaseModel):
    """
    Git Repository Source for Reusable Modules
    Points to the actual implementation code in your asset library
    """
    repo_url: str = Field(..., description="Git URL for the reusable module")
    branch: str = Field(default="main", description="Git branch to use")
    path: str = Field(..., description="Folder path within the monorepo")
    preview_image: Optional[str] = Field(
        None,
        description="Preview image URL for UI 'Vibe Check'"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "repo_url": "https://github.com/scogen-internal/assets.git",
                "branch": "main",
                "path": "backend/modules/auth_standard",
                "preview_image": "/assets/previews/auth_login_v1.png"
            }
        }


class TechnicalMapping(BaseModel):
    """
    The Nervous System - Technical Coordinates
    Maps requirements to actual code locations and enforcement rules
    """
    module_namespace: str = Field(..., description="Module/namespace identifier (e.g., 'auth', 'leads')")
    required_files: List[str] = Field(
        default_factory=list,
        description="Expected file paths that must exist (e.g., ['src/modules/auth/login.service.ts'])"
    )
    test_coverage_threshold: int = Field(
        default=80,
        ge=0,
        le=100,
        description="Minimum test coverage percentage required"
    )
    forbidden_patterns: List[str] = Field(
        default_factory=list,
        description="Code patterns that must NOT appear (e.g., ['eval()', 'console.log', 'md5'])"
    )
    code_namespace: Optional[str] = Field(
        None,
        description="Full namespace path (e.g., 'src.modules.auth')"
    )
    expected_file_pattern: Optional[str] = Field(
        None,
        description="Glob pattern for expected files (e.g., 'src/modules/auth/*.ts')"
    )
    test_id_pattern: Optional[str] = Field(
        None,
        description="Test identifier pattern (e.g., 'TEST_AUTH_*')"
    )
    security_level: Optional[str] = Field(
        None,
        description="Security classification (e.g., 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW')"
    )
    db_schema_snippet: Optional[str] = Field(
        None,
        description="SQL snippet for database schema injection (e.g., 'CREATE TABLE ...' or columns)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "module_namespace": "auth",
                "required_files": ["src/modules/auth/login.service.ts", "src/modules/auth/login.controller.ts"],
                "test_coverage_threshold": 95,
                "forbidden_patterns": ["eval()", "console.log", "md5"],
                "code_namespace": "src.modules.auth",
                "expected_file_pattern": "src/modules/auth/*.ts",
                "test_id_pattern": "TEST_AUTH_*",
                "security_level": "CRITICAL",
                "db_schema_snippet": "CREATE TABLE leads (id UUID, budget NUMERIC, bhk_type VARCHAR(10), location POINT...)"
            }
        }


class VariancePoint(BaseModel):
    """
    The 20% Customization Questions
    Determines which optional features to include
    """
    id: str = Field(..., description="Unique variance identifier (e.g., VAR_OTP)")
    question: str = Field(..., description="Question to ask client")
    trigger_if_yes: List[str] = Field(
        default_factory=list,
        description="List of Feature IDs to add if user says YES"
    )
    cost_impact: float = Field(default=0.0, description="Additional hours if enabled")


class ArchetypeFeature(BaseModel):
    """
    The 80% Standard Features
    Core requirements that come with every archetype
    """
    id: str = Field(..., description="Unique feature identifier (e.g., AUTH_01)")
    category: str = Field(..., description="Feature category (Authentication, Dashboard, etc.)")
    title: str = Field(..., description="Feature title")
    description: str = Field(..., description="Detailed feature description")
    standard_hours: float = Field(..., gt=0, description="Estimated hours for standard developer")
    complexity: str = Field(..., description="LOW, MEDIUM, HIGH, or EXTREME")
    acceptance_criteria: str = Field(..., description="Definition of done")
    
    # The Nerve Ending - Technical Implementation Coordinates
    technical_mapping: Optional[TechnicalMapping] = Field(
        None,
        description="Technical implementation details and enforcement rules"
    )
    
    # The Body - Asset Source (Git Repository)
    asset_source: Optional[AssetSource] = Field(
        None,
        description="Git repository source for reusable module"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "AUTH_01",
                "category": "Authentication",
                "title": "Email/Password Login",
                "description": "Standard login with JWT tokens",
                "standard_hours": 20,
                "complexity": "MEDIUM",
                "acceptance_criteria": "User can login and receive JWT token",
                "technical_mapping": {
                    "module_namespace": "auth",
                    "required_files": ["src/auth/service.py"],
                    "test_coverage_threshold": 100,
                    "forbidden_patterns": ["plain_text_password"]
                },
                "asset_source": {
                    "repo_url": "https://github.com/scogen-internal/assets.git",
                    "branch": "main",
                    "path": "backend/modules/auth_standard"
                }
            }
        }


class ArchetypeDefinition(BaseModel):
    """
    Complete Archetype Definition (RFC Standard)
    Represents a reusable 80% solution
    """
    id: str = Field(..., description="Archetype identifier (e.g., ARCH_CRM_STD_01)")
    name: str = Field(..., description="Human-readable name")
    version: str = Field(..., description="Semantic version (e.g., 1.0.0)")
    description: str = Field(..., description="Archetype description")
    base_hours: float = Field(..., gt=0, description="Total estimated hours")
    tech_stack: List[str] = Field(..., description="Required technologies")
    features: List[ArchetypeFeature] = Field(..., description="Standard features (the 80%)")
    variance_points: List[VariancePoint] = Field(
        default_factory=list,
        description="Customization questions (the 20%)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "ARCH_CRM_STD_01",
                "name": "Standard CRM",
                "version": "1.0.0",
                "description": "Baseline CRM for SMEs",
                "base_hours": 320,
                "tech_stack": ["React", "Node.js", "PostgreSQL"],
                "features": [],
                "variance_points": []
            }
        }


class ApplyArchetypeRequest(BaseModel):
    """
    Request to hydrate a project with archetype requirements
    """
    project_id: str = Field(..., description="Target project UUID")
    archetype_id: str = Field(..., description="Archetype to apply")
    variance_responses: Dict[str, bool] = Field(
        default_factory=dict,
        description="Variance answers (e.g., {'VAR_OTP': true, 'VAR_SOCIAL': false})"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "550e8400-e29b-41d4-a716-446655440000",
                "archetype_id": "ARCH_CRM_STD_01",
                "variance_responses": {
                    "VAR_OTP": True,
                    "VAR_SOCIAL": False
                }
            }
        }


class ApplyArchetypeResponse(BaseModel):
    """Response after applying archetype"""
    status: str
    requirements_added: int
    project_id: str
    archetype_id: str
    total_hours: float
    message: str
