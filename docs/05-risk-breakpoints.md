# Scogen Risk Breakpoint Analysis

## Purpose
Identify potential failure modes (legal, financial, technical, market) to ensure the system is **Anti-Fragile**.

**Persona**: Objectively Critical - actively hunting for weaknesses before they become problems.

---

## 1. Legal Breakpoints

### 1.1 Audio Recording Consent
**Risk**: Recording client conversations without proper consent = legal liability.

**Breakpoint Scenarios**:
- Client claims they didn't consent to recording
- Audio used in court without proper chain of custody
- GDPR/DPDPA violation for EU/India users

**Mitigation**:
- [ ] Explicit consent checkbox before session starts
- [ ] Audio consent timestamp in database (immutable)
- [ ] Consent version tracking (for policy updates)
- [ ] Geographic consent rules (EU vs India vs US)

**Implementation**:
```sql
-- audit_logs table already has:
user_consent_timestamp TIMESTAMPTZ NOT NULL
consent_version VARCHAR(20)
```

**Status**: ✅ Schema ready, needs UI implementation

---

### 1.2 Frozen Scope Enforceability
**Risk**: Client disputes frozen scope, claims it doesn't match agreement.

**Breakpoint Scenarios**:
- Hash mismatch between stored and claimed document
- Client modifies PDF and claims it's the original
- Timestamp manipulation

**Mitigation**:
- [ ] SHA-256 hash stored in database
- [ ] Blockchain timestamp (optional, for high-value projects)
- [ ] Email confirmation with hash sent to client
- [ ] Immutable audit log (PostgreSQL rule prevents updates)

**Implementation**:
```sql
-- projects table:
frozen_scope_hash TEXT  -- SHA-256
frozen_at TIMESTAMPTZ

-- Immutability rule:
CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
```

**Status**: ✅ Schema ready, needs hash generation logic

---

### 1.3 IP Ownership Disputes
**Risk**: Who owns the archetype library? The frozen scope? The context file?

**Breakpoint Scenarios**:
- Client claims ownership of archetype used in their project
- Scogen uses client-specific customization in another project
- Context file (.scogen) licensing unclear

**Mitigation**:
- [ ] Terms of Service: Client owns frozen scope, Scogen owns archetypes
- [ ] Archetype library license (MIT for open-source, proprietary for paid)
- [ ] Clear separation: Standard (80%) vs Variance (20%)
- [ ] Context file licensing (CC BY-NC for free tier, commercial for paid)

**Status**: 🚧 Needs legal review and ToS drafting

---

## 2. Financial Breakpoints

### 2.1 Margin Erosion
**Risk**: Shadow pricing fails, projects accepted below 40% margin.

**Breakpoint Scenarios**:
- Admin override becomes routine (bypasses margin guard)
- Complexity multipliers miscalibrated (underpricing)
- Internal cost calculation wrong (overestimating asset reuse)

**Mitigation**:
- [ ] Margin guard lock (requires explicit override reason)
- [ ] Override audit log (track who, when, why)
- [ ] Quarterly archetype pricing review
- [ ] Alert if override rate >10% of projects

**Implementation**:
```python
# pricing_calculations table:
margin_guard_passed BOOLEAN
override_reason TEXT
calculated_by UUID  # Admin who overrode
```

**Status**: ✅ Schema ready, needs enforcement logic

---

### 2.2 Behavioral Fee Evasion
**Risk**: Users game the system to avoid nuisance taxes.

**Breakpoint Scenarios**:
- Create multiple accounts to get free sessions
- Abandon session before deposit charged
- Claim "technical issue" to get refund

**Mitigation**:
- [ ] Email/phone verification (prevent multi-account)
- [ ] Deposit charged upfront (non-refundable if abandoned)
- [ ] Refund policy: Only if Scogen fails, not user error
- [ ] IP-based rate limiting

**Status**: 🚧 Needs payment integration (Razorpay/Stripe)

---

### 2.3 Marketplace Take Rate Pressure
**Risk**: 30% take rate too high, developers/clients go direct.

**Breakpoint Scenarios**:
- Developer and client connect, then transact off-platform
- Competing platforms offer lower rates (15-20%)
- Clients perceive no value in escrow/monitoring

**Mitigation**:
- [ ] Escrow value proposition (dispute resolution)
- [ ] AI monitoring adds tangible value (progress tracking)
- [ ] Non-compete clause in developer agreement (6 months)
- [ ] Tiered take rate (lower for high-volume clients)

**Status**: 🚧 Needs marketplace development

---

## 3. Technical Breakpoints

### 3.1 LLM Hallucination in Scoping
**Risk**: Ollama generates incorrect requirements, client builds wrong product.

**Breakpoint Scenarios**:
- LLM invents features client didn't ask for
- Misinterprets domain-specific terminology
- Generates technically infeasible requirements

**Mitigation**:
- [ ] Human-in-the-loop: AI generates, human approves
- [ ] Constraint registry catches common errors
- [ ] Archetype validation (requirements must map to proven patterns)
- [ ] Confidence scoring (flag low-confidence requirements)

**Implementation**:
```python
# requirements table:
confidence_score FLOAT  # 0.0 - 1.0
validation_status ENUM('pending', 'approved', 'rejected')
```

**Status**: 🚧 Needs AI validation layer

---

### 3.2 Vector Search Failure
**Risk**: pgvector similarity search returns irrelevant constraints.

**Breakpoint Scenarios**:
- Embedding model drift (nomic-embed-text updated)
- Insufficient training data (constraint registry empty)
- Query embedding doesn't match stored embeddings

**Mitigation**:
- [ ] Embedding model version tracking
- [ ] Re-embed all constraints on model update
- [ ] Fallback to keyword search if similarity <0.7
- [ ] Manual constraint tagging (backup to semantic search)

**Implementation**:
```sql
-- constraints_registry:
embedding_model VARCHAR(50)  -- Track model version
embedding_created_at TIMESTAMPTZ
```

**Status**: 🚧 Needs embedding versioning

---

### 3.3 Hardware Failure (Single Point of Failure)
**Risk**: GPU dies, entire system down.

**Breakpoint Scenarios**:
- RTX 4090 failure (no redundancy)
- Power outage (UPS runs out)
- Disk failure (RAID 1 protects data, but downtime)

**Mitigation**:
- [ ] RAID 1 for data (already planned)
- [ ] UPS for graceful shutdown (already planned)
- [ ] Cloud fallback: OpenAI API for critical sessions
- [ ] Monitoring: Alert on GPU temp >80°C

**Implementation**:
```python
# config.py:
ENABLE_CLOUD_FALLBACK: bool = True
OPENAI_API_KEY: Optional[str] = None  # Backup
```

**Status**: 🚧 Needs fallback logic

---

## 4. Market Breakpoints

### 4.1 Vibe Coder Saturation
**Risk**: Market for ₹8K context files is too small.

**Breakpoint Scenarios**:
- Only 1000 people in India willing to pay ₹8K
- Cursor/Replit add built-in scoping (free)
- Competitors offer similar for ₹2K

**Mitigation**:
- [ ] Expand to global market (English-speaking)
- [ ] Bundle with execution (context file + 10 hours dev)
- [ ] Freemium tier (basic archetype, upsell to full RFC)
- [ ] B2B pivot: Sell to agencies, not individuals

**Status**: 🚧 Needs market validation (MVP launch)

---

### 4.2 Agency Churn
**Risk**: Agencies subscribe, extract archetypes, then cancel.

**Breakpoint Scenarios**:
- Download all archetypes in month 1, cancel month 2
- Use archetypes in their own system (no attribution)
- Share login credentials across team (revenue leakage)

**Mitigation**:
- [ ] Archetype access gated by active subscription
- [ ] Watermarking: Archetypes include Scogen branding
- [ ] Seat-based pricing (enforce login limits)
- [ ] Annual contracts (discount for commitment)

**Status**: 🚧 Needs SaaS enforcement logic

---

### 4.3 Trust Deficit (India Market)
**Risk**: Clients don't trust "frozen scope" concept.

**Breakpoint Scenarios**:
- "This is just a PDF, I can make this in Word"
- "Why should I pay for a document?"
- "How do I know this is accurate?"

**Mitigation**:
- [ ] Social proof: Case studies, testimonials
- [ ] Money-back guarantee (if scope inaccurate)
- [ ] Free tier: Generate 1 module, upsell full scope
- [ ] Education: Blog posts on "cost of bad requirements"

**Status**: 🚧 Needs marketing/content strategy

---

## 5. Operational Breakpoints

### 5.1 Support Burden
**Risk**: Too many support requests, can't scale.

**Breakpoint Scenarios**:
- "How do I use this context file?"
- "My AI is still writing bad code"
- "I need help customizing the archetype"

**Mitigation**:
- [ ] Self-service: Video tutorials, documentation
- [ ] Community: Discord/Slack for peer support
- [ ] Paid support tier: ₹5K/month for priority help
- [ ] AI chatbot: Answer common questions

**Status**: 🚧 Needs support infrastructure

---

### 5.2 Archetype Maintenance
**Risk**: Archetypes become outdated (tech stack changes).

**Breakpoint Scenarios**:
- React 18 → React 19 (hooks change)
- PostgreSQL 15 → 16 (new features)
- Security best practices evolve

**Mitigation**:
- [ ] Archetype versioning (v1, v2, v3)
- [ ] Deprecation warnings (6-month notice)
- [ ] Community contributions (GitHub for archetypes)
- [ ] Quarterly review cycle

**Status**: 🚧 Needs archetype governance

---

## 6. Critical Path Dependencies

### What Must Work for MVP?

**Tier 1 (Blocker)**:
1. ✅ PostgreSQL + pgvector (data storage)
2. ✅ Ollama LLM (requirement generation)
3. 🚧 Payment gateway (Razorpay/Stripe)
4. 🚧 PDF generation (frozen scope output)

**Tier 2 (Important)**:
5. 🚧 Email service (consent, confirmations)
6. 🚧 Audio recording (MinIO + Whisper)
7. 🚧 Constraint registry (vector search)

**Tier 3 (Nice to Have)**:
8. 🚧 Marketplace (persona network)
9. 🚧 Dispute resolution AI
10. 🚧 Blockchain timestamping

---

## Mitigation Priority Matrix

| Risk | Impact | Probability | Priority | Status |
|------|--------|-------------|----------|--------|
| Audio consent violation | High | Medium | P0 | 🚧 Schema ready |
| Margin erosion | High | High | P0 | 🚧 Schema ready |
| LLM hallucination | High | Medium | P0 | 🚧 Needs validation |
| Hardware failure | Medium | Low | P1 | 🚧 Needs fallback |
| Market saturation | Medium | Medium | P1 | 🚧 Needs validation |
| Archetype staleness | Low | High | P2 | 🚧 Needs governance |

---

## Next Steps

### Immediate (Before Launch)
- [ ] Draft Terms of Service (IP ownership, consent)
- [ ] Implement margin guard enforcement
- [ ] Add payment gateway integration
- [ ] Create PDF generation service

### Short-term (Month 1-3)
- [ ] Build AI validation layer
- [ ] Set up email service
- [ ] Implement audio recording
- [ ] Launch MVP (Vibe Architect tier)

### Long-term (Month 4-12)
- [ ] Develop marketplace
- [ ] Add blockchain timestamping
- [ ] Build community support
- [ ] Expand archetype library

---

**Philosophy**: Every breakpoint is an opportunity to build a moat. The more we anticipate and mitigate, the more defensible Scogen becomes.
