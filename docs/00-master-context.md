# Project Scogen: The Agency Operating System

## Vision

Scogen is an AI-powered scoping and project management engine designed for software agencies. It converts natural language requirements (voice/text) into frozen, technical specifications (RFCs), calculates precise costs based on internal assets, and orchestrates execution via a network of personas and freelancers.

## Core Philosophy

### 1. Defense-First
The system prioritizes limiting liability and protecting margins over blind feature generation.

### 2. The Vault
Requirements are immutable 'frozen' assets, not chat logs.

### 3. Self-Hosted
The stack runs on local hardware to ensure data sovereignty and eliminate SaaS vendor risk.

---

## The Architecture: The Anti-Fragile Monolith

### Core Stack

- **Core**: Python (FastAPI) for logic + Orchestration
- **Database**: PostgreSQL (handling Relational Data + JSONB + pgvector for AI memory). No separate Vector DB.
- **Storage**: MinIO (S3 compatible) for local file storage
- **AI Inference**: Self-hosted Ollama (Llama-3) & Whisper (Speech-to-Text) running on local GPU hardware
- **Frontend**: Next.js (React) for the User/Admin interfaces

---

## Key Workflows

### 1. Ingestion: The Silent Listener
Captures intent, filters noise, and assesses 'Maturity Score'.

**Purpose**: Separate signal from noise in client conversations.

**Output**: Structured intent with confidence scoring.

### 2. Scoping
Maps intent to 'Standard Archetypes' (80% reusable) + 'Variance' (20% custom).

**Purpose**: Leverage proven patterns while accommodating unique requirements.

**Output**: Technical specification with archetype references.

### 3. Pricing: Shadow Pricing Engine
Calculates Client Price (Value-based) vs. Internal Cost (Asset-based).

**Purpose**: Protect margins while remaining competitive.

**Output**: Dual pricing with margin analysis.

### 4. The Deal Room (Phase 5)
A transparent, interactive negotiation space for clients.

**Purpose**: Streamline the "Handshake" process. Clients view a public link where they can see the frozen scope, toggle "Rush Mode" (timeline vs. cost), and digitally sign.

**Output**: A binding agreement (Accepted Proposal) that triggers the Execution Engine.

### 5. Execution
Breaks scope into atomic tasks (<4 hours) with strict Input/Output contracts.

**Purpose**: Enable distributed execution with clear accountability.

### 6. Client Command Center (Phase 7)
"Mission Control" for the client.

**Purpose**: Radical Transparency. A specialized dashboard showing real-time factory output, financial status, and legal assets.

**Output**: Eliminated "Buyer's Remorse" and zero status-update emails.

---

## Design Principles

### Immutability
Once frozen, requirements cannot be changed without explicit versioning and audit trail.

### Transparency
All pricing calculations are explainable and auditable.

### Defense in Depth
Multiple validation layers prevent scope creep and margin erosion.

### Asset Leverage
Maximize reuse of proven components to minimize execution cost.

---

## Success Metrics

- **Margin Protection**: Maintain >40% margin on all projects
- **Scope Accuracy**: <10% variance between estimate and actual
- **Asset Reuse**: >80% of requirements map to existing archetypes
- **Execution Efficiency**: Average task completion <3 hours

---

See also:
- [Infrastructure & Hardware](./01-infrastructure.md)
- [Pricing Algorithm](./02-pricing-algorithm.md)
- [Database Schema](./03-database-schema.md)
- [Nervous System Upgrade](./13-nervous-system-upgrade.md) - Traceability metadata for executable requirements
