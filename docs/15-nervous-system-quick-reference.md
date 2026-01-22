# Nervous System Quick Reference

**For Developers**: Quick guide to using the traceability metadata system.

---

## TL;DR

Requirements now have **nerve endings** that map them to actual code locations and enforcement rules.

```python
# Before
requirement = {
    "title": "Secure Login",
    "description": "Users can log in"
}

# After
requirement = {
    "title": "Secure Login",
    "description": "Users can log in",
    "traceability_meta": {
        "module": "auth",
        "required_files": ["src/auth/login.py"],
        "forbidden_patterns": ["plain_text_password"],
        "test_coverage_threshold": 100
    }
}
```

---

## Creating Archetypes with Technical Mapping

### Minimal Example

```json
{
  "id": "AUTH_001",
  "category": "Authentication",
  "title": "User Login",
  "description": "Standard login flow",
  "standard_hours": 12,
  "complexity": "MEDIUM",
  "acceptance_criteria": "User can log in with email/password",
  "technical_mapping": {
    "module": "auth",
    "required_files": ["src/auth/login.service.py"]
  }
}
```

### Full Example

```json
{
  "id": "AUTH_002",
  "category": "Authentication",
  "title": "Secure Login with JWT",
  "description": "Login with JWT tokens",
  "standard_hours": 12,
  "complexity": "MEDIUM",
  "acceptance_criteria": "JWT issued on successful login",
  "technical_mapping": {
    "module": "auth",
    "code_namespace": "src.modules.auth.login",
    "required_files": [
      "src/modules/auth/login.service.py",
      "src/modules/auth/jwt_handler.py"
    ],
    "expected_file_pattern": "src/modules/auth/login*.py",
    "test_id_pattern": "TEST_AUTH_LOGIN_*",
    "test_coverage_threshold": 100,
    "forbidden_patterns": [
      "plain_text_password",
      "localStorage.setItem('token'"
    ],
    "security_level": "CRITICAL"
  }
}
```

---

## Field Reference

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `module` | ✅ | string | Module identifier | `"auth"` |
| `required_files` | ❌ | array | Files that must exist | `["src/auth/login.py"]` |
| `test_coverage_threshold` | ❌ | int (0-100) | Min test coverage % | `95` |
| `forbidden_patterns` | ❌ | array | Banned code patterns | `["eval()", "md5"]` |
| `code_namespace` | ❌ | string | Full namespace | `"src.modules.auth"` |
| `expected_file_pattern` | ❌ | string | Glob pattern | `"src/auth/*.py"` |
| `test_id_pattern` | ❌ | string | Test ID pattern | `"TEST_AUTH_*"` |
| `security_level` | ❌ | string | Security level | `"CRITICAL"` |

---

## Common Patterns

### Authentication Features

```json
{
  "module": "auth",
  "required_files": ["src/auth/service.py"],
  "test_coverage_threshold": 100,
  "forbidden_patterns": [
    "plain_text_password",
    "md5",
    "sha1"
  ],
  "security_level": "CRITICAL"
}
```

### Payment Features

```json
{
  "module": "payment",
  "required_files": ["src/payment/stripe.service.py"],
  "test_coverage_threshold": 100,
  "forbidden_patterns": [
    "hardcoded_api_key",
    "console.log"
  ],
  "security_level": "CRITICAL"
}
```

### CRUD Features

```json
{
  "module": "leads",
  "required_files": ["src/leads/crud.py"],
  "test_coverage_threshold": 80,
  "forbidden_patterns": [
    "sql_injection",
    "eval()"
  ],
  "security_level": "MEDIUM"
}
```

### Dashboard/UI Features

```json
{
  "module": "dashboard",
  "required_files": ["src/dashboard/charts.component.tsx"],
  "test_coverage_threshold": 70,
  "forbidden_patterns": [
    "dangerouslySetInnerHTML"
  ],
  "security_level": "LOW"
}
```

---

## Forbidden Patterns Library

### Security

```json
"forbidden_patterns": [
  "plain_text_password",
  "md5",
  "sha1",
  "eval()",
  "exec(",
  "hardcoded_api_key",
  "hardcoded_secret"
]
```

### Frontend Security

```json
"forbidden_patterns": [
  "dangerouslySetInnerHTML",
  "localStorage.setItem('token'",
  "sessionStorage.setItem('token'",
  "document.write("
]
```

### Code Quality

```json
"forbidden_patterns": [
  "console.log",
  "debugger;",
  "TODO:",
  "FIXME:",
  "any as"
]
```

### Database

```json
"forbidden_patterns": [
  "sql_injection",
  "raw_query",
  "execute_raw"
]
```

---

## API Usage

### Get Requirement with Traceability

```python
from app.db import SessionLocal
from app.db.models import Requirement

db = SessionLocal()
req = db.query(Requirement).filter(
    Requirement.archetype_ref == "ARCH_CRM_STD_01::AUTH_002"
).first()

print(req.traceability_meta)
# {
#   "module": "auth",
#   "required_files": ["src/auth/login.service.py"],
#   "forbidden_patterns": ["plain_text_password"],
#   "test_coverage_threshold": 100
# }
```

### Query by Module

```python
# Find all auth requirements
auth_reqs = db.query(Requirement).filter(
    Requirement.traceability_meta['module'].astext == 'auth'
).all()
```

### Query by Security Level

```python
# Find all critical requirements
critical_reqs = db.query(Requirement).filter(
    Requirement.traceability_meta['security_level'].astext == 'CRITICAL'
).all()
```

---

## Future: AI Monitor Integration

The traceability metadata enables automated code verification:

```python
# Pseudocode for future AI Monitor
def verify_requirement(requirement: Requirement, codebase_path: str):
    meta = requirement.traceability_meta
    
    # Check 1: Required files exist
    for file_path in meta.get('required_files', []):
        if not os.path.exists(os.path.join(codebase_path, file_path)):
            return Violation(f"Missing required file: {file_path}")
    
    # Check 2: Forbidden patterns
    for file_path in meta.get('required_files', []):
        code = read_file(file_path)
        for pattern in meta.get('forbidden_patterns', []):
            if pattern in code:
                return Violation(f"Found forbidden pattern: {pattern}")
    
    # Check 3: Test coverage
    coverage = get_test_coverage(meta.get('module'))
    threshold = meta.get('test_coverage_threshold', 80)
    if coverage < threshold:
        return Violation(f"Coverage {coverage}% < {threshold}%")
    
    return Approved()
```

---

## Best Practices

### 1. Always Specify Module

```json
// ✅ Good
{
  "module": "auth"
}

// ❌ Bad
{
  "module": ""
}
```

### 2. Use Specific File Paths

```json
// ✅ Good
{
  "required_files": ["src/modules/auth/login.service.py"]
}

// ❌ Bad
{
  "required_files": ["auth.py"]
}
```

### 3. Be Specific with Forbidden Patterns

```json
// ✅ Good
{
  "forbidden_patterns": ["localStorage.setItem('token'"]
}

// ❌ Bad (too broad)
{
  "forbidden_patterns": ["localStorage"]
}
```

### 4. Set Realistic Coverage Thresholds

```json
// ✅ Good
{
  "test_coverage_threshold": 95  // For critical auth
}

// ❌ Bad (unrealistic)
{
  "test_coverage_threshold": 100  // For UI components
}
```

### 5. Use Security Levels Consistently

```
CRITICAL: Auth, Payment, Data Access
HIGH: User Management, File Upload
MEDIUM: Business Logic, CRUD
LOW: UI Components, Styling
```

---

## Troubleshooting

### Traceability Meta Not Populated

**Problem**: Requirements have empty `traceability_meta`

**Solution**: Ensure archetype JSON has `technical_mapping` field

```json
{
  "id": "AUTH_001",
  // ... other fields ...
  "technical_mapping": {  // ← Add this
    "module": "auth",
    "required_files": ["src/auth/service.py"]
  }
}
```

### Invalid JSON Schema

**Problem**: Archetype fails to load

**Solution**: Validate against TechnicalMapping schema

```python
from app.schemas.archetype import TechnicalMapping

# Test your mapping
mapping = TechnicalMapping(
    module="auth",
    required_files=["src/auth/login.py"],
    test_coverage_threshold=95
)
print(mapping.dict())
```

---

## Examples from RFC-001

See [`backend/library/archetypes/RFC-001-CRM-STANDARD.json`](file:///e:/scogen/scogen/backend/library/archetypes/RFC-001-CRM-STANDARD.json) for complete examples of:

- AUTH_001: User Registration
- AUTH_002: Secure Login with JWT
- AUTH_003: Password Reset
- AUTH_004: RBAC
- AUTH_005: Two-Factor Authentication

---

## Related Docs

- [Full Documentation](./13-nervous-system-upgrade.md)
- [Migration Guide](./14-migration-nervous-system.md)
- [Archetype Implementation](./12-archetype-implementation.md)

---

**Quick Start**: Copy an existing feature from RFC-001 and modify the `technical_mapping` to match your use case.
