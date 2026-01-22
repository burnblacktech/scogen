# Atomic Modules: The "Lego Blocks" Architecture

Scogen has evolved from using fixed templates (Archetypes) to a composable system called **Atomic Modules**. This approach, inspired by car manufacturing, allows us to capture niche markets instantly by swapping specialized "Engines" into a standard "Chassis".

## Core Concept

- **The Chassis**: A standard project structure (e.g., "Standard CRM").
- **The Engine**: Specialized modules that fulfill specific industry needs (e.g., "Real Estate Leads" or "HIPAA Compliant Medical Leads").

By swapping the Engine, we transform a generic product into a bespoke niche solution without rewriting core logic.

## The Component Swap Engine

The `ArchetypeService` now features a **Swapper Logic** that detects project context and automatically upgrades standard features to Atomic Modules.

### 1. Industry Detection
When a project is hydrated, the system scans the project description for keywords:
- "real estate" or "property" -> Swaps Generic Leads for **Real Estate Leads**.
- "mobile" or "otp" -> Swaps Email/Password Auth for **Mobile OTP Auth**.

### 2. Atomic Module Structure
Each module is a standalone JSON file in `backend/library/modules/`. It includes:
- **Technical Mapping**: Paths to specialized service files.
- **Complexity & Hours**: Precise estimates for the niche feature.
- **DB Schema Snippet**: (The "Boom") SQL snippets used to automatically generate migrations for niche-specific columns.

## Database Schema Injection (The "Boom")

Atomic Modules can include `db_schema_snippet`. When these modules are injected into a project, the `traceability_meta` in the `requirements` table is hydrated with this SQL.

**Example Real Estate Schema Injection:**
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  budget NUMERIC,
  bhk_type VARCHAR(10),
  location POINT
)
```

## Benefits
- **Granular Pricing**: Charge precisely for the complexity of the niche.
- **Infinite Niches**: Launch "CRM for Gyms", "CRM for Brokers", "CRM for Salons" using the same standard chassis.
- **Marketing Power**: Present a bespoke product to every industry.
