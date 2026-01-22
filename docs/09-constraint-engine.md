# The Constraint Refinement Loop (The Moat)

## Purpose
Learn from failures to build an ever-growing library of constraints that prevent future mistakes.

**Philosophy**: Every failure is a lesson. Every lesson becomes a rule.

---

## 1. The Red Flag Harvest

### Trigger: Human Reviewer Rejects Code

**Scenario**: Admin reviews disputed code and finds it violates best practices.

**System Workflow**:
```python
def harvest_constraint_from_rejection(review_id):
    """
    Extract constraint from code rejection
    """
    review = get_review(review_id)
    
    # Get reviewer comment
    comment = review["rejection_reason"]
    # Example: "You used MongoDB for transactions, which is unsafe here"
    
    # AI extracts rule
    rule = ollama_client.generate(
        prompt=f"""
        Extract a general constraint rule from this code review comment:
        
        "{comment}"
        
        Format:
        RULE: [General principle]
        CONTEXT: [When this applies]
        RATIONALE: [Why this matters]
        """,
        system="You are a technical architect extracting best practices."
    )
    
    # Parse response
    constraint = parse_constraint(rule)
    # Output:
    # {
    #   "rule": "Financial transactions must use SQL with ACID compliance",
    #   "context": "Any feature involving money, payments, or financial records",
    #   "rationale": "MongoDB lacks ACID guarantees, risking data inconsistency"
    # }
    
    # Generate embedding for semantic search
    embedding = ollama_client.embed(constraint["rule"])
    
    # Create constraint candidate
    create_constraint_candidate(
        trigger_text=constraint["rule"],
        trigger_condition=embedding,
        enforcement_rule=constraint["rationale"],
        origin_project=review["project_id"],
        severity="ERROR"
    )
```

---

### Constraint Candidate Approval

**Workflow**:
1. AI creates constraint candidate
2. Admin reviews and approves/rejects
3. Approved constraints added to registry
4. Registry used in future scoping sessions

**Database**:
```sql
CREATE TABLE constraint_candidates (
    id UUID PRIMARY KEY,
    trigger_text TEXT NOT NULL,
    trigger_condition VECTOR(1536),
    enforcement_rule TEXT NOT NULL,
    severity VARCHAR(20),
    
    -- Origin
    origin_project UUID REFERENCES projects(id),
    origin_review UUID REFERENCES code_reviews(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Approval
    status VARCHAR(20) CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ
);

-- Approved constraints move to main registry
INSERT INTO constraints_registry (trigger_text, trigger_condition, enforcement_rule, severity)
SELECT trigger_text, trigger_condition, enforcement_rule, severity
FROM constraint_candidates
WHERE status = 'APPROVED';
```

---

## 2. The Post-Mortem Injection

### Trigger: Project Profit Margin < Target

**Scenario**: Project completed but margin was only 25% (target: 40%).

**System Workflow**:
```python
def analyze_margin_shortfall(project_id):
    """
    Identify why margin was below target
    """
    project = get_project(project_id)
    
    # Calculate margin
    client_price = project["client_price"]
    internal_cost = project["internal_cost"]
    margin = (client_price - internal_cost) / client_price
    
    if margin < 0.40:
        # Find tasks that exceeded budget
        overbudget_tasks = find_overbudget_tasks(project_id)
        
        for task in overbudget_tasks:
            # Analyze why task took longer
            estimated_hours = task["estimated_hours"]
            actual_hours = task["actual_hours"]
            variance = actual_hours - estimated_hours
            
            if variance > 2:  # More than 2 hours over
                # Create pricing adjustment
                create_pricing_adjustment(
                    feature_id=task["feature_id"],
                    current_estimate=estimated_hours,
                    recommended_estimate=actual_hours,
                    reason=f"Historical data shows {variance}h variance",
                    buffer_percentage=calculate_buffer(variance)
                )
```

**Example**:
```python
# Task: S3 Integration
# Estimated: 4 hours
# Actual: 20 hours
# Variance: +400%

create_pricing_adjustment(
    feature_id="INTEGRATION_S3",
    current_estimate=4,
    recommended_estimate=12,  # Conservative estimate
    reason="S3 SDK complexity + IAM permissions setup",
    buffer_percentage=200  # 2x buffer for future estimates
)
```

---

### Pricing Adjustment Database

```sql
CREATE TABLE pricing_adjustments (
    id UUID PRIMARY KEY,
    feature_id TEXT NOT NULL,
    
    -- Estimates
    current_estimate DECIMAL,
    recommended_estimate DECIMAL,
    variance_percentage DECIMAL,
    
    -- Reasoning
    reason TEXT,
    buffer_percentage DECIMAL,
    
    -- Origin
    origin_project UUID REFERENCES projects(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Approval
    status VARCHAR(20) CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ
);

-- Apply approved adjustments to archetypes
UPDATE archetypes
SET standard_features = jsonb_set(
    standard_features,
    '{estimated_hours}',
    to_jsonb((SELECT recommended_estimate FROM pricing_adjustments WHERE feature_id = 'INTEGRATION_S3' AND status = 'APPROVED'))
)
WHERE archetype_id = 'ARCH_CRM_STD_V1';
```

---

## 3. The Auto-Enforcer (The Moat)

### Runtime Check During Scoping

**Scenario**: User starts new project: "I want a Fintech App"

**System Workflow**:
```python
def check_constraints_during_scoping(project_description):
    """
    Proactively check constraints during scoping
    """
    # Generate embedding of project description
    description_embedding = ollama_client.embed(project_description)
    
    # Search constraint registry for similar triggers
    constraints = search_constraints(description_embedding, threshold=0.8)
    
    # Apply constraints
    for constraint in constraints:
        if constraint["severity"] == "ERROR":
            # Block violating options
            block_tech_stack_option(constraint["blocked_technology"])
            
            # Show warning to user
            show_warning(
                message=constraint["enforcement_rule"],
                reason=constraint["rationale"]
            )
        
        elif constraint["severity"] == "WARNING":
            # Allow but warn
            show_advisory(
                message=constraint["enforcement_rule"],
                recommendation=constraint["alternative"]
            )
```

**Example**:
```python
# User input: "I want a Fintech App"
# Embedding: [0.123, -0.456, ...]

# Search constraints
constraints = search_constraints([0.123, -0.456, ...], threshold=0.8)

# Found constraint:
{
    "constraint_id": "CST-99",
    "trigger_text": "Financial transactions require ACID compliance",
    "similarity": 0.92,
    "enforcement_rule": "Block MongoDB selection for fintech projects",
    "severity": "ERROR",
    "blocked_technology": "MongoDB",
    "alternative": "PostgreSQL with transaction support"
}

# System action:
# 1. Remove MongoDB from tech stack options
# 2. Show warning:
```

**User sees**:
```
⚠️ Constraint Applied

Based on past projects, we've blocked MongoDB for fintech applications.

Reason: MongoDB lacks ACID transaction guarantees, which are critical for 
financial data integrity.

Recommended: PostgreSQL with full transaction support.

This constraint was learned from 3 previous projects where MongoDB caused 
data inconsistency issues.
```

---

## 4. Constraint Vector Search

### Semantic Similarity Search

**Implementation**:
```sql
-- Find similar constraints using pgvector
SELECT 
    id,
    trigger_text,
    enforcement_rule,
    failure_count,
    1 - (trigger_condition <=> $1::vector) AS similarity
FROM constraints_registry
WHERE 1 - (trigger_condition <=> $1::vector) > 0.8
ORDER BY similarity DESC
LIMIT 5;
```

**Python Wrapper**:
```python
def search_constraints(embedding, threshold=0.8):
    """
    Search for relevant constraints using vector similarity
    """
    query = """
        SELECT 
            id,
            trigger_text,
            enforcement_rule,
            severity,
            failure_count,
            1 - (trigger_condition <=> %s::vector) AS similarity
        FROM constraints_registry
        WHERE 1 - (trigger_condition <=> %s::vector) > %s
        ORDER BY similarity DESC
        LIMIT 10;
    """
    
    results = db.execute(query, (embedding, embedding, threshold))
    return results.fetchall()
```

---

## 5. Constraint Categories

### Technical Constraints
**Examples**:
- "Use PostgreSQL for ACID transactions"
- "Implement rate limiting for public APIs"
- "Hash passwords with bcrypt (12 rounds minimum)"

### Security Constraints
**Examples**:
- "Never store API keys in code"
- "Sanitize all user input before database queries"
- "Use HTTPS for all external communications"

### Performance Constraints
**Examples**:
- "Database queries must complete in <100ms"
- "API responses must be <200ms"
- "Images must be optimized (<500KB)"

### Business Logic Constraints
**Examples**:
- "Refunds require manager approval for amounts >₹10,000"
- "User data deletion must be logged for audit"
- "Email notifications must have unsubscribe link"

---

## 6. Constraint Lifecycle

```
┌─────────────────┐
│ Code Rejection  │
│ or Margin Issue │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Extracts     │
│ Constraint Rule │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create          │
│ Candidate       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin Reviews   │
│ & Approves      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Add to          │
│ Registry        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Applied in      │
│ Future Scoping  │
└─────────────────┘
```

---

## 7. Constraint Metrics

### Effectiveness Tracking

```sql
CREATE TABLE constraint_applications (
    id UUID PRIMARY KEY,
    constraint_id UUID REFERENCES constraints_registry(id),
    project_id UUID REFERENCES projects(id),
    
    -- Application
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    action_taken VARCHAR(50),  -- 'BLOCKED', 'WARNED', 'SUGGESTED'
    
    -- Outcome
    user_accepted BOOLEAN,
    alternative_chosen TEXT,
    
    -- Impact
    prevented_issue BOOLEAN,
    estimated_hours_saved DECIMAL
);

-- Calculate constraint ROI
SELECT 
    c.trigger_text,
    COUNT(*) as times_applied,
    SUM(ca.estimated_hours_saved) as total_hours_saved,
    AVG(ca.user_accepted::int) as acceptance_rate
FROM constraints_registry c
JOIN constraint_applications ca ON c.id = ca.constraint_id
WHERE ca.prevented_issue = true
GROUP BY c.id
ORDER BY total_hours_saved DESC;
```

---

## 8. Example: Complete Constraint Flow

### Step 1: Failure Occurs
```
Project: Fintech App for XYZ
Issue: Data inconsistency in transactions
Root Cause: MongoDB used instead of PostgreSQL
Impact: 40 hours debugging + client refund (₹50,000)
```

### Step 2: Constraint Extracted
```python
{
    "trigger_text": "Financial transactions require ACID compliance",
    "enforcement_rule": "Block MongoDB for fintech/payment projects",
    "severity": "ERROR",
    "rationale": "MongoDB lacks ACID guarantees, causing data inconsistency",
    "alternative": "PostgreSQL with transaction support"
}
```

### Step 3: Constraint Approved
```sql
INSERT INTO constraints_registry (
    trigger_text,
    trigger_condition,
    enforcement_rule,
    severity,
    origin_project,
    failure_count
) VALUES (
    'Financial transactions require ACID compliance',
    [0.123, -0.456, ...],  -- Embedding
    'Block MongoDB for fintech/payment projects',
    'ERROR',
    'proj-xyz-123',
    1
);
```

### Step 4: Constraint Applied
```
New Project: "I want a payment gateway"

System checks constraints:
✓ Found: CST-99 (similarity: 0.94)
✓ Action: Block MongoDB from tech stack
✓ Show warning to user
✓ Suggest PostgreSQL

Result: User selects PostgreSQL
Impact: Prevented 40-hour debugging session
```

---

## 9. The Moat Effect

**Compounding Value**:
- Year 1: 50 constraints → Prevents 10 failures
- Year 2: 150 constraints → Prevents 50 failures
- Year 3: 300 constraints → Prevents 150 failures

**Competitive Advantage**:
- New competitors start with 0 constraints
- Scogen has 300+ battle-tested rules
- Every project makes the system smarter

**Network Effect**:
- More projects → More failures → More constraints
- More constraints → Fewer failures → Higher margins
- Higher margins → More competitive pricing → More projects

---

See also:
- [RFC Standard](./06-rfc-standard.md) - How constraints affect archetypes
- [Atomic Work Packet](./07-atomic-work-packet.md) - Defense mechanisms
- [Risk Breakpoints](./05-risk-breakpoints.md) - What constraints prevent
