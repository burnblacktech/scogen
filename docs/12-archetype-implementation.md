# Archetype Loader Implementation Guide

## Overview

This document details the Archetype Loader implementation - the asset pipeline that transforms static RFC JSON files into active database requirements, enabling the 80/20 reusable solution model.

**Status**: ✅ Complete (2026-01-21)

---

## Architecture

### Core Concept: The Asset Pipeline

**The 80/20 Model**:
- **80% Standard Features**: Pre-defined, reusable requirements
- **20% Variance**: Client-specific customization questions

**The Flow**:
1. **Parser**: Reads RFC JSON files from library
2. **Validator**: Validates against Pydantic schema
3. **Variance Engine**: Processes customization responses
4. **Hydrator**: Inserts requirements into database

---

## Implementation Files

### 1. Archetype Schemas
**File**: `backend/app/schemas/archetype.py`

Pydantic models for validation:

```python
class ArchetypeFeature(BaseModel):
    id: str
    category: str
    title: str
    description: str
    standard_hours: float
    complexity: str  # LOW, MEDIUM, HIGH, EXTREME
    acceptance_criteria: Optional[str]

class VariancePoint(BaseModel):
    id: str
    question: str
    trigger_if_yes: List[str]  # Feature IDs to add
    cost_impact: float

class ArchetypeDefinition(BaseModel):
    id: str
    name: str
    version: str
    description: str
    base_hours: float
    tech_stack: List[str]
    features: List[ArchetypeFeature]
    variance_points: List[VariancePoint]
```

---

### 2. Archetype Service
**File**: `backend/app/services/archetype_service.py`

Core business logic:

```python
class ArchetypeService:
    def list_available_archetypes(self) -> List[ArchetypeDefinition]:
        """Scans library folder and returns valid archetypes"""
        
    def get_archetype_by_id(self, archetype_id: str) -> Optional[ArchetypeDefinition]:
        """Finds a specific archetype"""
        
    def apply_archetype_to_project(
        self, 
        db: Session, 
        request: ApplyArchetypeRequest
    ) -> ApplyArchetypeResponse:
        """
        The Hydration Logic:
        1. Load archetype from library
        2. Verify project exists
        3. Process variance responses
        4. Create Requirement objects
        5. Bulk insert into database
        """
```

---

### 3. API Endpoints
**File**: `backend/app/routers/archetypes.py`

Four endpoints:

#### GET `/api/archetypes/`
List all available archetypes

#### GET `/api/archetypes/{archetype_id}`
Get specific archetype details

#### GET `/api/archetypes/{archetype_id}/summary`
Get archetype statistics

#### POST `/api/archetypes/apply`
Hydrate project with archetype requirements

---

## RFC JSON Format

### Example: RFC-001-CRM-STANDARD.json

```json
{
  "id": "ARCH_CRM_STD_01",
  "name": "Standard CRM System",
  "version": "1.0.0",
  "description": "Complete CRM with auth, leads, dashboard",
  "base_hours": 320,
  "tech_stack": ["React", "FastAPI", "PostgreSQL", "Redis"],
  "features": [
    {
      "id": "AUTH_001",
      "category": "Authentication",
      "title": "User Registration with Email Verification",
      "description": "User can register with email and password",
      "standard_hours": 8,
      "complexity": "MEDIUM",
      "acceptance_criteria": "User can register, verify email, activate account"
    }
  ],
  "variance_points": [
    {
      "id": "VAR_2FA",
      "question": "Do you require two-factor authentication?",
      "trigger_if_yes": ["AUTH_005"],
      "cost_impact": 12
    }
  ]
}
```

---

## Usage Examples

### Example 1: List Archetypes
```bash
curl http://localhost:8000/api/archetypes/
```

**Response**:
```json
[
  {
    "id": "ARCH_CRM_STD_01",
    "name": "Standard CRM System",
    "version": "1.0.0",
    "base_hours": 320,
    "features": [...],
    "variance_points": [...]
  }
]
```

---

### Example 2: Get Archetype Summary
```bash
curl http://localhost:8000/api/archetypes/ARCH_CRM_STD_01/summary
```

**Response**:
```json
{
  "id": "ARCH_CRM_STD_01",
  "name": "Standard CRM System",
  "version": "1.0.0",
  "total_features": 17,
  "total_hours": 320,
  "variance_points": 2,
  "tech_stack": ["React", "FastAPI", "PostgreSQL", "Redis"],
  "categories": ["Authentication", "Lead Management", "Dashboard", "User Management"]
}
```

---

### Example 3: Apply Archetype to Project
```python
import requests

response = requests.post(
    "http://localhost:8000/api/archetypes/apply",
    json={
        "project_id": "12ae662b-bd35-4957-a091-d86aeb5392c6",
        "archetype_id": "ARCH_CRM_STD_01",
        "variance_responses": {
            "VAR_2FA": True,
            "VAR_CUSTOM_REPORTS": False
        }
    }
)

print(response.json())
# {
#   "status": "SUCCESS",
#   "requirements_added": 17,
#   "project_id": "12ae662b-bd35-4957-a091-d86aeb5392c6",
#   "archetype_id": "ARCH_CRM_STD_01",
#   "total_hours": 320,
#   "message": "Successfully added 17 requirements from Standard CRM System"
# }
```

---

## Database Integration

### Requirement Creation

When applying an archetype, each feature becomes a Requirement:

```python
req = Requirement(
    project_id=UUID(request.project_id),
    archetype_ref=f"{archetype.id}::{feat.id}",  # Traceability
    title=feat.title,
    description=feat.description,
    acceptance_criteria=feat.acceptance_criteria,
    complexity_score=complexity_map[feat.complexity],
    estimated_hours=feat.standard_hours,
    constraints={
        "category": feat.category,
        "archetype_version": archetype.version,
        "tech_stack": archetype.tech_stack
    }
)
```

### Archetype Reference Format

```
{archetype_id}::{feature_id}

Examples:
- ARCH_CRM_STD_01::AUTH_001
- ARCH_CRM_STD_01::LEAD_002
- ARCH_CRM_STD_01::DASH_003
```

This enables:
- Traceability from requirement to source
- Archetype versioning
- Feature reuse tracking

---

## Complexity Mapping

```python
complexity_map = {
    "LOW": 1.0,      # Simple CRUD, forms
    "MEDIUM": 1.2,   # Business logic, integrations
    "HIGH": 1.5,     # Complex algorithms, real-time
    "EXTREME": 2.0   # AI/ML, advanced features
}
```

Used by pricing engine for margin calculation.

---

## Variance Processing

### The 20% Customization

Variance points allow client-specific customization:

```json
{
  "id": "VAR_2FA",
  "question": "Do you require two-factor authentication for all users?",
  "trigger_if_yes": ["AUTH_005"],
  "cost_impact": 12
}
```

**Logic**:
- If client answers YES → Add AUTH_005 feature
- If client answers NO → Skip AUTH_005 feature
- Cost impact: +12 hours

---

## Integration with Pricing Engine

Complete workflow:

```python
# 1. Apply archetype
apply_response = apply_archetype(
    project_id="...",
    archetype_id="ARCH_CRM_STD_01",
    variance_responses={"VAR_2FA": True}
)

# 2. Get requirements
requirements = db.query(Requirement).filter(
    Requirement.project_id == project_id
).all()

# 3. Calculate pricing
pricing_requests = []
for req in requirements:
    pricing_requests.append({
        "task_name": req.title,
        "standard_hours": req.estimated_hours,
        "complexity": map_score_to_complexity(req.complexity_score),
        "assigned_persona": "SENIOR",
        "actual_resource": "JUNIOR",
        "is_asset_reused": True  # Using archetype!
    })

# 4. Get project pricing
project_pricing = calculate_project_pricing(pricing_requests)

# Result: High client price, low internal cost = massive margin
```

---

## Creating New Archetypes

### Step 1: Define Features

Identify the 80% standard features:
- What's common across all implementations?
- What can be pre-built and reused?

### Step 2: Define Variance Points

Identify the 20% customization:
- What varies by client?
- What are the decision points?

### Step 3: Create JSON File

```json
{
  "id": "ARCH_ECOMMERCE_STD_01",
  "name": "Standard E-commerce",
  "version": "1.0.0",
  "description": "Complete e-commerce platform",
  "base_hours": 480,
  "tech_stack": ["Next.js", "FastAPI", "PostgreSQL", "Stripe"],
  "features": [
    {
      "id": "PROD_001",
      "category": "Product Management",
      "title": "Product Catalog",
      "description": "Manage products with variants",
      "standard_hours": 40,
      "complexity": "MEDIUM",
      "acceptance_criteria": "CRUD for products, variants, images"
    }
  ],
  "variance_points": [
    {
      "id": "VAR_MULTI_CURRENCY",
      "question": "Do you need multi-currency support?",
      "trigger_if_yes": ["PAYMENT_MULTI_CURRENCY"],
      "cost_impact": 24
    }
  ]
}
```

### Step 4: Save to Library

Save as `backend/library/archetypes/RFC-002-ECOMMERCE-STANDARD.json`

---

## API Documentation

Interactive API docs:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Navigate to "Archetypes" section.

---

## Testing

### Create Test Project

```python
from app.db import SessionLocal, User, Project

db = SessionLocal()

user = User(email="test@scogen.com", full_name="Test User", role="OWNER")
db.add(user)
db.commit()

project = Project(
    owner_id=user.id,
    name="Test CRM",
    description="Test project",
    status="DRAFT"
)
db.add(project)
db.commit()

print(f"Project ID: {project.id}")
```

### Apply Archetype

```bash
curl -X POST http://localhost:8000/api/archetypes/apply \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "12ae662b-bd35-4957-a091-d86aeb5392c6",
    "archetype_id": "ARCH_CRM_STD_01",
    "variance_responses": {}
  }'
```

### Verify Requirements

```sql
SELECT 
    id, 
    title, 
    archetype_ref, 
    estimated_hours, 
    complexity_score
FROM scogen.requirements
WHERE project_id = '12ae662b-bd35-4957-a091-d86aeb5392c6';
```

---

## Troubleshooting

### Archetype Not Found
**Problem**: GET `/api/archetypes/` returns empty array

**Solutions**:
1. Check `library/archetypes/` directory exists
2. Verify JSON files are valid
3. Check Pydantic schema validation errors in logs

### Invalid JSON Schema
**Problem**: Archetype fails to load

**Solutions**:
1. Validate JSON syntax
2. Ensure all required fields present
3. Check field types match schema

### Hydration Fails
**Problem**: POST `/api/archetypes/apply` returns 404

**Solutions**:
1. Verify project exists in database
2. Check archetype_id is correct
3. Review database connection

---

## References

- [RFC Standard Documentation](./06-rfc-standard.md)
- [Database Schema](./03-database-schema.md)
- [Pricing Engine](./11-pricing-implementation.md)
- [Nervous System Upgrade](./13-nervous-system-upgrade.md) - **NEW**: Traceability metadata for executable requirements
- [Pydantic Documentation](https://docs.pydantic.dev/)

---

**Last Updated**: 2026-01-21  
**Status**: Production Ready  
**Version**: 1.0.0
