# The Atomic Work Packet (AWP)

## Philosophy
To prevent 'Frankenstein Code', no worker starts from zero. They execute a strict Input/Output contract.

**Core Principle**: Every task is < 4 hours with clear acceptance criteria.

---

## The AWP JSON Structure

Every task assigned to a Persona follows this schema:

```json
{
  "task_id": "TSK-502",
  "linked_requirement": "REQ-AUTH-01",
  "time_to_live": "4 Hours",
  
  "context_injection": {
    "style_guide": "src/styles/theme.css",
    "db_schema": "src/db/schema.prisma",
    "lint_rules": ".eslintrc.json",
    "api_contracts": "src/types/api.ts"
  },
  
  "input_assets": [
    "Figma_Link_Frame_22",
    "API_Contract.ts"
  ],
  
  "acceptance_criteria": {
    "type": "AUTOMATED_TEST",
    "test_file": "tests/auth/login.test.ts",
    "condition": "Must pass with 100% coverage",
    "performance_threshold": "Response time < 200ms"
  },
  
  "defense_mechanism": "Block commit if 'try/catch' is used without 'GlobalErrorWrapper'."
}
```

---

## Field Definitions

### task_id
Unique identifier for the work packet.

**Format**: `TSK-{NUMBER}`

**Example**: `TSK-502`

---

### linked_requirement
References the requirement from the frozen scope.

**Format**: `REQ-{MODULE}-{NUMBER}`

**Example**: `REQ-AUTH-01` (from RFC-001-CRM-STANDARD)

**Purpose**: Traceability from requirement → task → code → test

---

### time_to_live
Maximum time allowed for task completion.

**Constraint**: Must be ≤ 4 hours

**Rationale**: 
- Prevents scope creep
- Forces atomic task design
- Enables accurate time tracking

---

### context_injection
Pre-seeded files that the worker's IDE must load.

**Purpose**: Ensure consistency across codebase

**Examples**:
- `style_guide`: CSS/design tokens
- `db_schema`: Database schema (Prisma/SQL)
- `lint_rules`: ESLint/Prettier config
- `api_contracts`: TypeScript interfaces

**Implementation**:
```bash
# Worker's IDE automatically loads these files
cursor --add-file src/styles/theme.css
cursor --add-file src/db/schema.prisma
cursor --add-file .eslintrc.json
```

---

### input_assets
External resources required to complete the task.

**Types**:
- Figma designs
- API contracts
- Mock data
- Third-party documentation

**Example**:
```json
{
  "input_assets": [
    {
      "type": "figma",
      "url": "https://figma.com/file/xyz/frame-22",
      "description": "Login page design"
    },
    {
      "type": "contract",
      "file": "src/types/auth-api.ts",
      "description": "Authentication API interface"
    }
  ]
}
```

---

### acceptance_criteria
Automated validation that must pass before submission.

**Types**:

#### 1. Automated Test
```json
{
  "type": "AUTOMATED_TEST",
  "test_file": "tests/auth/login.test.ts",
  "condition": "Must pass with 100% coverage",
  "performance_threshold": "Response time < 200ms"
}
```

#### 2. Linter Check
```json
{
  "type": "LINTER",
  "rules": ".eslintrc.json",
  "condition": "Zero errors, zero warnings"
}
```

#### 3. Visual Regression
```json
{
  "type": "VISUAL_REGRESSION",
  "baseline": "screenshots/login-page-baseline.png",
  "threshold": "95% similarity"
}
```

---

### defense_mechanism
Custom validation rules specific to this task.

**Examples**:
- "Block commit if 'try/catch' is used without 'GlobalErrorWrapper'"
- "Reject if SQL query uses string concatenation (SQL injection risk)"
- "Fail if API response doesn't include rate limit headers"

**Implementation**:
```python
# Pre-commit hook
def validate_defense_mechanism(code, mechanism):
    if "try/catch" in code and "GlobalErrorWrapper" not in code:
        raise ValidationError(mechanism)
```

---

## The Workflow

### 1. AI Monitor Generates AWP

Based on frozen scope, the AI Monitor creates work packets:

```python
def generate_awp(requirement):
    """
    Convert requirement to Atomic Work Packet
    """
    return {
        "task_id": generate_task_id(),
        "linked_requirement": requirement["id"],
        "time_to_live": calculate_time_estimate(requirement),
        "context_injection": get_project_context(),
        "input_assets": extract_assets(requirement),
        "acceptance_criteria": generate_tests(requirement),
        "defense_mechanism": get_constraints(requirement)
    }
```

---

### 2. Matcher Assigns to Persona

The Matcher service assigns AWPs to available personas:

```python
def assign_awp(awp):
    """
    Match AWP to best-fit persona
    """
    # Find persona with matching skills
    persona = find_persona(
        skills=awp["required_skills"],
        availability=True,
        rating_min=4.0
    )
    
    # Assign task
    persona.assign_task(awp)
    
    # Seed IDE with context
    seed_ide(persona.workspace, awp["context_injection"])
```

---

### 3. Worker Accepts

The worker (freelancer/persona) accepts the task:

**IDE Setup**:
- Context files automatically loaded
- Test file created with failing tests
- Defense mechanisms enabled in pre-commit hooks

**Worker View**:
```
Task: TSK-502
Requirement: Implement email/password login
Time Limit: 4 hours
Status: In Progress

Context Files:
✓ theme.css loaded
✓ schema.prisma loaded
✓ .eslintrc.json loaded

Acceptance Criteria:
☐ tests/auth/login.test.ts (0/5 passing)
☐ ESLint (12 errors)
☐ Performance (not measured)
```

---

### 4. Submission Validation

The system automatically validates submission:

```python
def validate_submission(task_id, code):
    """
    Validate AWP submission
    """
    awp = get_awp(task_id)
    
    # Run tests
    test_result = run_tests(awp["acceptance_criteria"]["test_file"])
    if not test_result.passed:
        return reject("Tests failed", test_result.failures)
    
    # Check coverage
    if test_result.coverage < 100:
        return reject("Coverage < 100%", test_result.coverage)
    
    # Check defense mechanism
    if not validate_defense(code, awp["defense_mechanism"]):
        return reject("Defense mechanism violated")
    
    # Performance check
    if test_result.avg_response_time > 200:
        return reject("Performance threshold exceeded")
    
    return accept(task_id)
```

---

## AWP Database Schema

```sql
CREATE TABLE atomic_work_packets (
    id UUID PRIMARY KEY,
    task_id TEXT UNIQUE NOT NULL,
    linked_requirement UUID REFERENCES requirements(id),
    
    -- Timing
    time_to_live_hours INTEGER NOT NULL CHECK (time_to_live_hours <= 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Assignment
    assigned_to UUID REFERENCES personas(id),
    status VARCHAR(20) CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REJECTED')),
    
    -- Content
    context_injection JSONB NOT NULL,
    input_assets JSONB,
    acceptance_criteria JSONB NOT NULL,
    defense_mechanism TEXT,
    
    -- Validation
    submission_code TEXT,
    test_results JSONB,
    rejection_reason TEXT
);

CREATE INDEX idx_awp_status ON atomic_work_packets(status);
CREATE INDEX idx_awp_assigned_to ON atomic_work_packets(assigned_to);
```

---

## Example: Complete AWP for Login Feature

```json
{
  "task_id": "TSK-001",
  "linked_requirement": "REQ-AUTH-01",
  "time_to_live": "4 Hours",
  
  "context_injection": {
    "style_guide": "src/styles/theme.css",
    "db_schema": "src/db/schema.prisma",
    "lint_rules": ".eslintrc.json",
    "api_contracts": "src/types/auth-api.ts",
    "error_handling": "src/utils/error-wrapper.ts"
  },
  
  "input_assets": [
    {
      "type": "figma",
      "url": "https://figma.com/file/abc/login-page",
      "description": "Login page design - Frame 22"
    },
    {
      "type": "api_spec",
      "file": "docs/api/auth-endpoints.md",
      "description": "POST /api/auth/login specification"
    }
  ],
  
  "acceptance_criteria": {
    "type": "AUTOMATED_TEST",
    "test_file": "tests/auth/login.test.ts",
    "tests": [
      "should login with valid credentials",
      "should reject invalid credentials",
      "should hash password with bcrypt (12 rounds)",
      "should return JWT token on success",
      "should rate limit after 5 failed attempts"
    ],
    "coverage_requirement": 100,
    "performance_threshold": "Response time < 200ms"
  },
  
  "defense_mechanism": "Block commit if: (1) Password is stored in plain text, (2) SQL query uses string concatenation, (3) JWT secret is hardcoded",
  
  "required_skills": ["Node.js", "Express", "PostgreSQL", "Jest"],
  "estimated_difficulty": "Medium",
  "priority": "High"
}
```

---

## Benefits of AWP System

### 1. Quality Assurance
- Automated testing prevents bad code
- Defense mechanisms catch common mistakes
- Context injection ensures consistency

### 2. Time Management
- 4-hour limit forces atomic design
- Clear acceptance criteria prevent scope creep
- Time tracking enables accurate estimates

### 3. Traceability
- Every task links to requirement
- Test coverage ensures completeness
- Audit trail from requirement → code

### 4. Scalability
- Standardized format enables automation
- Personas can work in parallel
- Easy to distribute across freelancers

---

See also:
- [RFC Standard](./06-rfc-standard.md) - How requirements are defined
- [Dispute Resolution](./08-dispute-resolution.md) - What happens when AWP fails
- [Constraint Engine](./09-constraint-engine.md) - How defense mechanisms are learned
