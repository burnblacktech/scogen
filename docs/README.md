# Scogen Documentation Index

## Core Documentation

### [00 - Master Context](./00-master-context.md)
Project vision, philosophy, architecture, and key workflows.

**Topics:**
- Vision & Core Philosophy
- The Anti-Fragile Monolith architecture
- Key Workflows (Ingestion, Scoping, Pricing, Execution)
- Design Principles & Success Metrics

---

### [01 - Infrastructure & Hardware](./01-infrastructure.md)
Hardware specifications for self-hosted deployment.

**Topics:**
- Compute requirements (CPU, RAM, Storage)
- AI Acceleration (GPU configuration)
- Network & Power requirements
- Cost estimates & performance expectations

---

### [02 - Pricing Algorithm](./02-pricing-algorithm.md)
Shadow Pricing Engine (SRPE) logic and implementation.

**Topics:**
- Dual pricing formula (Client Price vs Internal Cost)
- Margin Guard rules
- Metered monetization (SaaS layer)
- Archetype library structure

---

### [03 - Database Schema](./03-database-schema.md)
PostgreSQL schema with pgvector for AI memory.

**Topics:**
- Projects (The Vault)
- Requirements (The Atoms)
- Constraints Registry (The Moat)
- Audit Logs (The Evidence)
- Users, Archetypes, Pricing Calculations

---

### [04 - Commercial Strategy](./04-commercial-strategy.md)
Segmented value pricing and go-to-market strategy.

**Topics:**
- B2C: The Vibe Architect (₹8K asset sale)
- B2B SaaS: Agency Operating System (₹15K/mo + usage)
- Marketplace: Platform execution (30% take rate)
- Behavioral Pricing: Nuisance taxes and filters
- Revenue roadmap and success metrics

---

### [05 - Risk Breakpoints](./05-risk-breakpoints.md)
Anti-fragile analysis of potential failure modes.

**Topics:**
- Legal breakpoints (consent, IP, enforceability)
- Financial risks (margin erosion, fee evasion)
- Technical failures (LLM, vector search, hardware)
- Market risks (saturation, churn, trust deficit)
- Mitigation priorities and critical dependencies

---

### [06 - RFC Standard](./06-rfc-standard.md)
The blueprint for 80% reusable assets (archetypes).

**Topics:**
- Archetype structure (metadata, features, variance points)
- Standard features (the 80%)
- Variance points (the 20% - AI prompts)
- Traceability matrix (feature → test mapping)
- AI agent usage and versioning

---

### [07 - Atomic Work Packet](./07-atomic-work-packet.md)
Execution contracts for distributed work (<4 hours).

**Topics:**
- AWP structure and philosophy
- Context injection and input assets
- Acceptance criteria (automated tests)
- Defense mechanisms
- Workflow: AI Monitor → Matcher → Worker → Validation

---

### [08 - Dispute Resolution](./08-dispute-resolution.md)
Automated arbitration with evidence chain.

**Topics:**
- Evidence chain (freeze scope → hash → WORM storage)
- Automated arbitration scenarios (buggy code, wrong feature, deadline)
- Red Flag dashboard for human review
- Refund calculation and worker penalties

---

### [09 - Constraint Engine](./09-constraint-engine.md)
The learning system that builds the moat.

**Topics:**
- Red Flag harvest (learning from rejections)
- Post-mortem injection (pricing adjustments)
- Auto-enforcer (runtime constraint checking)
- Vector search for semantic matching
- Constraint lifecycle and ROI tracking

---

### [10 - Database Implementation](./10-database-implementation.md)
Complete implementation guide for the database foundation.

**Topics:**
- SQLAlchemy 2.0 models (User, Project, Requirement, ConstraintRegistry, AuditLog)
- Database setup and initialization
- Usage examples and best practices
- Vector search implementation
- Performance optimization
- Troubleshooting guide

---

### [11 - Pricing Implementation](./11-pricing-implementation.md)
Complete implementation guide for the Shadow Pricing Engine.

**Topics:**
- Shadow pricing algorithm (dual pricing calculation)
- Financial constants and rate cards
- Pydantic schemas and API endpoints
- Business logic examples (arbitrage scenarios)
- Testing and integration
- Future enhancements

---

### [12 - Archetype Implementation](./12-archetype-implementation.md)
Complete implementation guide for the Archetype Loader (Asset Pipeline).

**Topics:**
- The 80/20 model (standard features + variance)
- Archetype schemas and validation
- Loader service and hydration logic
- API endpoints and usage examples
- RFC JSON format and creation guide
- Integration with pricing engine

---

## Quick Links

- **Getting Started**: See [README.md](../README.md)
- **API Documentation**: http://localhost:8000/docs (when running)
- **Archon Knowledge Base**: Structured data in MCP server

---

## Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| Master Context | ✅ Complete | 2026-01-21 |
| Infrastructure | ✅ Complete | 2026-01-21 |
| Pricing Algorithm | ✅ Complete | 2026-01-21 |
| Database Schema | ✅ Complete | 2026-01-21 |
| Commercial Strategy | ✅ Complete | 2026-01-21 |
| Risk Breakpoints | ✅ Complete | 2026-01-21 |
| RFC Standard | ✅ Complete | 2026-01-21 |
| Atomic Work Packet | ✅ Complete | 2026-01-21 |
| Dispute Resolution | ✅ Complete | 2026-01-21 |
| Constraint Engine | ✅ Complete | 2026-01-21 |
| Database Implementation | ✅ Complete | 2026-01-21 |
| Pricing Implementation | ✅ Complete | 2026-01-21 |
| Archetype Implementation | ✅ Complete | 2026-01-21 |
| Archetype Implementation | ✅ Complete | 2026-01-21 |
| Setup Guide | ✅ Complete | 2026-01-21 |
| Client Command Center | ✅ Complete | 2026-01-22 |
| The Sentinel (Observability) | ✅ Complete | 2026-01-22 |
| The Variance Interceptor | ✅ Complete | 2026-01-22 |
| API Reference | 🚧 Pending | - |
| Deployment Guide | 🚧 Pending | - |

---

## Contributing to Documentation

1. Keep documentation in sync with code
2. Use clear, concise language
3. Include code examples where relevant
4. Link related documents
5. Update this index when adding new docs
