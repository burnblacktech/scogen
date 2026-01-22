# The Scogen RFC Standard (Archetype Definition)

## Purpose
To store 'Standard Scope Blocks' (e.g., CRM, E-commerce) that are 80% complete, readable by both Humans and MCP Agents.

---

## Structure (JSON + Markdown)

### 1. Metadata

```json
{
  "archetype_id": "ARCH_CRM_STD_V1",
  "domain": "CRM",
  "complexity_tier": "Standard (Level 2)",
  "base_hours": 800,
  "tech_stack_constraints": ["PostgreSQL", "React", "Node.js"]
}
```

**Fields**:
- `archetype_id`: Unique identifier (format: `ARCH_{DOMAIN}_{TYPE}_V{VERSION}`)
- `domain`: Business domain (CRM, E-commerce, Fintech, etc.)
- `complexity_tier`: Standard (Level 1-5) - affects pricing multiplier
- `base_hours`: Market hours for standard implementation
- `tech_stack_constraints`: Required technologies

---

### 2. The Standard Features (The 80%)

**Philosophy**: This section is pre-approved. AI assumes 'YES' unless Variance is triggered.

**Example**:
- **[AUTH_01]**: User Login (Email/Pass) with Bcrypt hashing (12 rounds)
- **[AUTH_02]**: Forgot Password flow (SMTP integration)
- **[DB_01]**: Relational Schema for Users/Leads/Activities
- **[DASH_01]**: Analytics Dashboard with 5 standard widgets
- **[API_01]**: RESTful API with JWT authentication

**Format**:
```json
{
  "standard_features": [
    {
      "feature_id": "AUTH_01",
      "name": "Email/Password Login",
      "description": "User authentication with bcrypt hashing (12 rounds)",
      "estimated_hours": 8,
      "dependencies": ["DB_01"],
      "test_coverage_required": 100
    }
  ]
}
```

---

### 3. The Variance Points (The 20% - AI Prompts)

**Philosophy**: The AI uses these to interrogate the user and customize the archetype.

**Example Variance Points**:

**VAR_01 (Auth)**:
- **Question**: "Do you need OTP Login?"
- **If YES**: Swap `[AUTH_01]` for `[AUTH_OTP_01]` (+10 Hours)
- **If NO**: Keep standard email/password

**VAR_02 (Roles)**:
- **Question**: "Do you need Hierarchy (Manager → Team Member)?"
- **If YES**: Inject `[RBAC_MODULE]` (+40 Hours)
- **If NO**: Simple role-based access (Admin/User)

**VAR_03 (Integrations)**:
- **Question**: "Which payment gateway? (Stripe/Razorpay/None)"
- **Stripe**: Inject `[PAYMENT_STRIPE]` (+24 Hours)
- **Razorpay**: Inject `[PAYMENT_RAZORPAY]` (+24 Hours)
- **None**: Skip payment module

**Format**:
```json
{
  "variance_points": [
    {
      "variance_id": "VAR_01",
      "category": "Authentication",
      "question": "Do you need OTP Login?",
      "options": [
        {
          "choice": "YES",
          "action": "swap",
          "from": "AUTH_01",
          "to": "AUTH_OTP_01",
          "hours_delta": 10
        },
        {
          "choice": "NO",
          "action": "keep",
          "feature": "AUTH_01"
        }
      ]
    }
  ]
}
```

---

### 4. The Traceability Matrix

**Purpose**: Maps every feature to a Test Case ID for automated validation.

**Example**:
- `AUTH_01` → `TEST_AUTH_LOGIN_SUCCESS`
- `AUTH_01` → `TEST_AUTH_LOGIN_INVALID_CREDS`
- `AUTH_02` → `TEST_AUTH_PASSWORD_RESET_EMAIL`
- `DB_01` → `TEST_DB_SCHEMA_VALIDATION`

**Format**:
```json
{
  "traceability_matrix": {
    "AUTH_01": [
      "TEST_AUTH_LOGIN_SUCCESS",
      "TEST_AUTH_LOGIN_INVALID_CREDS",
      "TEST_AUTH_LOGIN_SQL_INJECTION"
    ],
    "AUTH_02": [
      "TEST_AUTH_PASSWORD_RESET_EMAIL",
      "TEST_AUTH_PASSWORD_RESET_EXPIRY"
    ]
  }
}
```

---

## Complete Archetype Example

```json
{
  "archetype_id": "ARCH_CRM_STD_V1",
  "domain": "CRM",
  "complexity_tier": "Standard (Level 2)",
  "base_hours": 800,
  "tech_stack_constraints": ["PostgreSQL", "React", "Node.js"],
  
  "standard_features": [
    {
      "feature_id": "AUTH_01",
      "name": "Email/Password Login",
      "description": "User authentication with bcrypt hashing (12 rounds)",
      "estimated_hours": 8,
      "dependencies": [],
      "acceptance_criteria": [
        "User can login with valid credentials",
        "Invalid credentials show error message",
        "Password is hashed with bcrypt (12 rounds)"
      ]
    },
    {
      "feature_id": "LEADS_01",
      "name": "Lead Management",
      "description": "CRUD operations for leads with status tracking",
      "estimated_hours": 24,
      "dependencies": ["AUTH_01", "DB_01"],
      "acceptance_criteria": [
        "Create/Read/Update/Delete leads",
        "Status workflow: New → Contacted → Qualified → Lost",
        "Assign leads to sales reps"
      ]
    }
  ],
  
  "variance_points": [
    {
      "variance_id": "VAR_01",
      "category": "Authentication",
      "question": "Do you need OTP Login?",
      "options": [
        {
          "choice": "YES",
          "action": "swap",
          "from": "AUTH_01",
          "to": "AUTH_OTP_01",
          "hours_delta": 10
        },
        {
          "choice": "NO",
          "action": "keep",
          "feature": "AUTH_01"
        }
      ]
    }
  ],
  
  "traceability_matrix": {
    "AUTH_01": [
      "TEST_AUTH_LOGIN_SUCCESS",
      "TEST_AUTH_LOGIN_INVALID_CREDS"
    ],
    "LEADS_01": [
      "TEST_LEADS_CREATE",
      "TEST_LEADS_UPDATE_STATUS"
    ]
  }
}
```

---

## AI Agent Usage

### Loading an Archetype

```python
# MCP Agent reads archetype
archetype = load_archetype("ARCH_CRM_STD_V1")

# Present variance questions to user
for variance in archetype["variance_points"]:
    user_choice = ask_user(variance["question"])
    apply_variance(variance, user_choice)

# Generate final scope
final_scope = generate_scope(archetype)
```

### Generating Work Packets

```python
# For each feature, create Atomic Work Packet
for feature in final_scope["features"]:
    awp = create_work_packet(
        feature_id=feature["feature_id"],
        test_cases=archetype["traceability_matrix"][feature["feature_id"]],
        estimated_hours=feature["estimated_hours"]
    )
    assign_to_persona(awp)
```

---

## Archetype Versioning

**Version Format**: `V{MAJOR}.{MINOR}`

**Major Version** (V1 → V2):
- Breaking changes (tech stack change)
- Significant feature additions/removals
- Schema changes

**Minor Version** (V1.0 → V1.1):
- Bug fixes in estimates
- Additional variance points
- Test case additions

**Example**:
- `ARCH_CRM_STD_V1.0` - Initial release
- `ARCH_CRM_STD_V1.1` - Added VAR_03 (Payment gateway)
- `ARCH_CRM_STD_V2.0` - Migrated to TypeScript

---

## Storage Location

**File Structure**:
```
backend/library/archetypes/
├── ARCH_CRM_STD_V1.json
├── ARCH_ECOMMERCE_STD_V1.json
├── ARCH_FINTECH_STD_V1.json
└── README.md
```

**Database Reference**:
```sql
CREATE TABLE archetypes (
    id TEXT PRIMARY KEY,  -- e.g., 'ARCH_CRM_STD_V1'
    domain VARCHAR(50),
    complexity_tier VARCHAR(50),
    base_hours DECIMAL,
    tech_stack JSONB,
    standard_features JSONB,
    variance_points JSONB,
    traceability_matrix JSONB,
    version INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

---

See also:
- [Atomic Work Packet](./07-atomic-work-packet.md) - Execution layer
- [Pricing Algorithm](./02-pricing-algorithm.md) - How base_hours affects pricing
- [Database Schema](./03-database-schema.md) - Storage structure
