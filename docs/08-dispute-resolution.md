# The Dispute Resolution Protocol (The Gavel)

## Purpose
Automated arbitration system for handling disputes between clients and execution team.

**Philosophy**: Evidence-based resolution with minimal human intervention.

---

## 1. The Evidence Chain

### Step A: User Clicks 'Freeze Scope'

**Action**: User confirms requirements are final

**System Response**:
```python
def freeze_scope(project_id):
    # Generate PDF from requirements
    pdf = generate_pdf(project_id)
    
    # Get audio recording (if voice session)
    audio = get_audio_recording(project_id)
    
    # Generate SHA-256 hash
    scope_hash = hashlib.sha256(pdf.content).hexdigest()
    audio_hash = hashlib.sha256(audio.content).hexdigest() if audio else None
    
    # Store in database
    update_project(
        project_id=project_id,
        status='FROZEN',
        frozen_scope_hash=scope_hash,
        frozen_at=datetime.now()
    )
    
    # Upload to MinIO (WORM storage)
    upload_to_minio(pdf, f"scopes/{project_id}/frozen-scope.pdf")
    if audio:
        upload_to_minio(audio, f"scopes/{project_id}/session-audio.mp3")
    
    return scope_hash
```

---

### Step B: System Generates PDF + Audio Log

**PDF Contents**:
1. Executive Summary
2. Requirements List (with IDs)
3. Acceptance Criteria
4. Technical Constraints
5. Timeline & Cost Estimate
6. Signatures (Digital)

**Audio Log**:
- Full session recording
- Transcript with timestamps
- Sentiment analysis markers
- Key decision points highlighted

---

### Step C: System Generates SHA-256 Hash

**Purpose**: Cryptographic proof of document integrity

**Implementation**:
```python
import hashlib

def generate_hash(file_content):
    """
    Generate SHA-256 hash of file
    """
    return hashlib.sha256(file_content).hexdigest()

# Example
pdf_hash = generate_hash(frozen_scope_pdf)
# Output: "a3f5b8c9d2e1f4a7b6c5d8e9f2a1b4c7d6e5f8a9b2c1d4e7f6a5b8c9d2e1f4a7"
```

**Storage**:
```sql
UPDATE projects
SET frozen_scope_hash = 'a3f5b8c9d2e1f4a7...',
    frozen_at = NOW()
WHERE id = project_id;
```

---

### Step D: Files Uploaded to MinIO (WORM Storage)

**WORM**: Write-Once-Read-Many

**Purpose**: Immutable evidence storage

**MinIO Configuration**:
```python
from minio import Minio

# Initialize MinIO client
minio_client = Minio(
    "localhost:9000",
    access_key="minioadmin",
    secret_key="changeme",
    secure=False
)

# Upload with WORM policy
def upload_evidence(file_path, object_name):
    """
    Upload file to MinIO with WORM policy
    """
    minio_client.fput_object(
        bucket_name="scogen-evidence",
        object_name=object_name,
        file_path=file_path,
        metadata={
            "x-amz-object-lock-mode": "COMPLIANCE",
            "x-amz-object-lock-retain-until-date": "2030-01-01T00:00:00Z"
        }
    )
```

**Storage Structure**:
```
scogen-evidence/
├── {project_id}/
│   ├── frozen-scope.pdf
│   ├── session-audio.mp3
│   ├── session-transcript.txt
│   └── metadata.json
```

---

## 2. Automated Arbitration Logic

### Trigger: User Clicks "Raise Dispute"

**System Workflow**:
```python
def handle_dispute(dispute_id, dispute_type):
    """
    Route dispute to appropriate handler
    """
    if dispute_type == "BUGGY_CODE":
        return handle_buggy_code_dispute(dispute_id)
    elif dispute_type == "WRONG_FEATURE":
        return handle_wrong_feature_dispute(dispute_id)
    elif dispute_type == "MISSED_DEADLINE":
        return handle_deadline_dispute(dispute_id)
    else:
        return escalate_to_human(dispute_id)
```

---

### Scenario A: "It's Buggy"

**Claim**: "The delivered code doesn't work"

**AI Logic**:
```python
def handle_buggy_code_dispute(dispute_id):
    """
    Validate buggy code claim
    """
    dispute = get_dispute(dispute_id)
    task_id = dispute["task_id"]
    
    # 1. Retrieve CI/CD logs
    ci_logs = get_ci_logs(task_id)
    
    # 2. Check test results
    test_results = ci_logs["test_results"]
    last_commit_date = ci_logs["last_commit_date"]
    deadline = get_task_deadline(task_id)
    
    # 3. Apply logic
    if test_results["status"] == "PASS" and last_commit_date < deadline:
        return {
            "verdict": "REJECT_CLAIM",
            "reason": f"Code passed certified tests on {last_commit_date}",
            "evidence": {
                "test_log_url": ci_logs["url"],
                "tests_passed": test_results["passed"],
                "tests_failed": test_results["failed"],
                "coverage": test_results["coverage"]
            }
        }
    else:
        return {
            "verdict": "SUSTAIN_CLAIM",
            "reason": "Tests failed or deadline missed",
            "action": "Refund client, penalize worker"
        }
```

**Response to Client**:
```
Claim Rejected

Your dispute has been automatically reviewed.

Evidence:
- Code passed 47/47 tests on 2026-01-15 14:23:00
- Test coverage: 100%
- Deadline: 2026-01-16 00:00:00
- Submitted: 2026-01-15 14:23:00 (9 hours early)

View Test Logs: [Link to CI/CD]

If you believe this is incorrect, you may escalate to human review (₹500 fee).
```

---

### Scenario B: "Not What I Asked For"

**Claim**: "The delivered feature doesn't match my requirements"

**AI Logic**:
```python
def handle_wrong_feature_dispute(dispute_id):
    """
    Semantic comparison of requirement vs delivery
    """
    dispute = get_dispute(dispute_id)
    
    # 1. Retrieve frozen scope
    frozen_scope = get_frozen_scope(dispute["project_id"])
    requirement = frozen_scope["requirements"][dispute["requirement_id"]]
    
    # 2. Retrieve delivered code
    delivered_code = get_delivered_code(dispute["task_id"])
    
    # 3. Semantic comparison using LLM
    comparison = ollama_client.generate(
        prompt=f"""
        Compare the requirement with the delivered code:
        
        REQUIREMENT:
        {requirement["description"]}
        
        ACCEPTANCE CRITERIA:
        {requirement["acceptance_criteria"]}
        
        DELIVERED CODE:
        {delivered_code}
        
        Does the code meet the requirement? Respond with:
        - MATCH: X% (0-100)
        - REASON: Brief explanation
        """,
        system="You are a technical auditor. Be objective and precise."
    )
    
    # 4. Parse response
    match_percentage = extract_percentage(comparison)
    reason = extract_reason(comparison)
    
    # 5. Apply threshold
    if match_percentage < 80:
        return {
            "verdict": "FLAG_FOR_HUMAN_REVIEW",
            "match_percentage": match_percentage,
            "reason": reason,
            "evidence": {
                "requirement": requirement,
                "delivered_code": delivered_code,
                "ai_analysis": comparison
            }
        }
    else:
        return {
            "verdict": "REJECT_CLAIM",
            "match_percentage": match_percentage,
            "reason": f"Code matches requirement ({match_percentage}%)"
        }
```

---

### Scenario C: "Missed Deadline"

**Claim**: "The work wasn't delivered on time"

**AI Logic**:
```python
def handle_deadline_dispute(dispute_id):
    """
    Validate deadline claim
    """
    dispute = get_dispute(dispute_id)
    task = get_task(dispute["task_id"])
    
    # Check timestamps
    deadline = task["deadline"]
    submitted_at = task["submitted_at"]
    
    if submitted_at > deadline:
        hours_late = (submitted_at - deadline).total_seconds() / 3600
        
        return {
            "verdict": "SUSTAIN_CLAIM",
            "reason": f"Task submitted {hours_late:.1f} hours late",
            "action": "Partial refund based on delay",
            "refund_percentage": calculate_refund(hours_late)
        }
    else:
        return {
            "verdict": "REJECT_CLAIM",
            "reason": f"Task submitted on time ({submitted_at})"
        }
```

---

## 3. The 'Red Flag' Dashboard

### When AI Escalates to Human

**Trigger Conditions**:
- Semantic match < 80%
- Client requests human review (₹500 fee)
- Worker disputes AI verdict
- High-value project (>₹1L)

**Admin Dashboard View**:

```
┌─────────────────────────────────────────────────────────────┐
│ Dispute #DIS-142                                            │
│ Project: CRM System for ABC Corp                            │
│ Amount: ₹45,000                                             │
│ Status: PENDING HUMAN REVIEW                                │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────┐
│ LEFT: What Client Said   │ RIGHT: What Was Delivered        │
├──────────────────────────┼──────────────────────────────────┤
│ Audio Transcript:        │ Delivered Code:                  │
│                          │                                  │
│ [00:03:42]               │ ```javascript                    │
│ "I need the dashboard    │ function renderDashboard() {     │
│  to show REAL-TIME       │   setInterval(() => {            │
│  updates, like every     │     fetchData();                 │
│  5 seconds"              │   }, 30000); // 30 seconds       │
│                          │ }                                │
│ Highlighted in yellow    │ ```                              │
│                          │                                  │
│ AI Analysis:             │ Worker's Defense:                │
│ "Client requested 5-sec  │ "30 seconds is industry          │
│  updates, code uses      │  standard for dashboards.        │
│  30-second polling"      │  5 seconds would overload        │
│                          │  the server."                    │
└──────────────────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Evidence:                                                   │
│ ✓ Audio recording (12:34 timestamp)                        │
│ ✓ Frozen scope PDF (Section 3.2)                           │
│ ✓ Code repository (commit abc123)                          │
│ ✓ Test logs (all passed)                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Actions:                                                    │
│ [Sustain Dispute - Refund Client] [Overrule - Release Funds]│
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Dispute Resolution Database Schema

```sql
CREATE TABLE disputes (
    id UUID PRIMARY KEY,
    dispute_id TEXT UNIQUE NOT NULL,
    project_id UUID REFERENCES projects(id),
    task_id UUID REFERENCES atomic_work_packets(id),
    
    -- Claim
    dispute_type VARCHAR(50) CHECK (dispute_type IN ('BUGGY_CODE', 'WRONG_FEATURE', 'MISSED_DEADLINE', 'OTHER')),
    claim_description TEXT NOT NULL,
    claimed_by UUID REFERENCES users(id),
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evidence
    frozen_scope_hash TEXT,
    audio_recording_s3_key TEXT,
    code_repository_url TEXT,
    test_logs JSONB,
    
    -- AI Analysis
    ai_verdict VARCHAR(50) CHECK (ai_verdict IN ('REJECT_CLAIM', 'SUSTAIN_CLAIM', 'FLAG_FOR_HUMAN_REVIEW')),
    ai_analysis JSONB,
    ai_confidence_score FLOAT,
    
    -- Human Review
    human_reviewer UUID REFERENCES users(id),
    human_verdict VARCHAR(50),
    human_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    
    -- Resolution
    status VARCHAR(50) CHECK (status IN ('PENDING', 'AUTO_RESOLVED', 'HUMAN_REVIEW', 'RESOLVED', 'CLOSED')),
    resolution_action VARCHAR(50),
    refund_amount DECIMAL,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_project ON disputes(project_id);
```

---

## 5. Refund Calculation Logic

```python
def calculate_refund(dispute):
    """
    Calculate refund amount based on dispute type
    """
    if dispute["ai_verdict"] == "SUSTAIN_CLAIM":
        if dispute["dispute_type"] == "BUGGY_CODE":
            # Full refund if code is broken
            return dispute["task_amount"] * 1.0
        
        elif dispute["dispute_type"] == "WRONG_FEATURE":
            # Partial refund based on match percentage
            match = dispute["ai_analysis"]["match_percentage"]
            refund_percentage = (100 - match) / 100
            return dispute["task_amount"] * refund_percentage
        
        elif dispute["dispute_type"] == "MISSED_DEADLINE":
            # Sliding scale based on delay
            hours_late = dispute["hours_late"]
            if hours_late < 4:
                return dispute["task_amount"] * 0.25
            elif hours_late < 24:
                return dispute["task_amount"] * 0.50
            else:
                return dispute["task_amount"] * 1.0
    
    return 0  # No refund if claim rejected
```

---

## 6. Penalty System for Workers

```python
def apply_worker_penalty(dispute):
    """
    Penalize worker for sustained disputes
    """
    if dispute["ai_verdict"] == "SUSTAIN_CLAIM":
        worker = get_worker(dispute["assigned_to"])
        
        # Deduct from escrow
        deduct_from_escrow(worker.id, dispute["task_amount"])
        
        # Update reputation
        worker.dispute_count += 1
        worker.rating -= 0.5
        
        # Suspension logic
        if worker.dispute_count >= 3:
            suspend_worker(worker.id, days=30)
        
        # Permanent ban
        if worker.dispute_count >= 5:
            ban_worker(worker.id)
```

---

See also:
- [Atomic Work Packet](./07-atomic-work-packet.md) - Task structure
- [Risk Breakpoints](./05-risk-breakpoints.md) - Legal considerations
- [Database Schema](./03-database-schema.md) - Audit logs
