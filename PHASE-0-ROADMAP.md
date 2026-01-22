# Scogen - Phase 0: Ignition Execution Roadmap

## Overview
This document tracks the execution of Phase 0: Ignition - initializing the physical and digital environment for Scogen development.

---

## Step 01: Hardware Procurement ⏳

**Status**: Planning / Ordering

### Checklist
- [ ] CPU: AMD Ryzen 9 7950X (or equivalent)
- [ ] RAM: 128GB DDR5
- [ ] GPU: 2x NVIDIA RTX 3090/4090
- [ ] Storage: 2x 2TB NVMe SSD (RAID 1)
- [ ] OS: Ubuntu Server 22.04 LTS

**Estimated Cost**: ₹3,50,000 - ₹4,50,000

**See**: [docs/SETUP.md](./docs/SETUP.md) for detailed procurement checklist

---

## Step 02: Repository Initialization ✅

**Status**: Complete

### Completed Tasks
- [x] Created monorepo directory structure
- [x] Generated docker-compose.yml
- [x] Created backend Dockerfile
- [x] Created PostgreSQL init script
- [x] Set up directory structure for ai_engine, database/migrations

### Directory Structure
```
scogen/
├── backend/              # FastAPI
│   ├── app/             # Application code
│   ├── library/         # Archetypes & assets
│   ├── tests/           # Tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # Next.js
├── ai_engine/           # Ollama interactions
├── database/            # Migration scripts
├── infrastructure/      # Docker configs
│   ├── docker/
│   ├── postgres/
│   ├── minio/
│   ├── ollama/
│   └── caddy/
└── docs/                # Documentation
```

**Next**: Test `docker compose up -d`

---

## Step 03: The First RFC ✅

**Status**: Complete

### Created
**RFC-001-CRM-STANDARD.json**

### Contents
- 4 modules (Auth, Leads, Dashboard, User Management)
- 19 detailed requirements
- 320 estimated hours
- Pricing metadata
- Technical constraints
- Integration points

**Location**: `/backend/library/archetypes/RFC-001-CRM-STANDARD.json`

**Quality**: Human-quality baseline established

---

## Step 04: Local AI Setup ⏳

**Status**: Ready to execute

### Commands to Run
```bash
# Option 1: Docker (Recommended)
docker compose up -d ollama
docker exec -it scogen-ollama ollama pull llama3:8b
docker exec -it scogen-ollama ollama pull nomic-embed-text

# Option 2: Local Installation
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3:8b
ollama pull nomic-embed-text
```

### Checklist
- [ ] Ollama installed/running
- [ ] llama3:8b model pulled
- [ ] nomic-embed-text model pulled
- [ ] Test inference successful

**Test Command**:
```bash
ollama run llama3:8b "Hello, Scogen!"
```

---

## Additional Setup Created

### Infrastructure Files
- [x] `docker-compose.yml` - PostgreSQL, MinIO, Ollama, Backend, Frontend
- [x] `backend/Dockerfile` - Python 3.11 with FastAPI
- [x] `infrastructure/postgres/init.sql` - pgvector extension setup

### AI Engine
- [x] `ai_engine/__init__.py` - Package initialization
- [x] `ai_engine/ollama_client.py` - Ollama client with generate/embed/chat methods

### Documentation
- [x] `docs/SETUP.md` - Comprehensive setup guide
- [x] Hardware procurement checklist
- [x] Docker troubleshooting guide

---

## Milestone Check

**"Ready to Code"** Status:

| Requirement | Status |
|-------------|--------|
| Hardware specs documented | ✅ Complete |
| Repo structure created | ✅ Complete |
| Docker compose file ready | ✅ Complete |
| PostgreSQL init script | ✅ Complete |
| Truth Asset (CRM RFC) | ✅ Complete |
| AI client code | ✅ Complete |
| Setup documentation | ✅ Complete |
| Docker services running | ⏳ Pending (requires `docker compose up`) |
| Ollama models pulled | ⏳ Pending |

---

## Next Actions

### Immediate (Can do now)
1. Run `docker compose up -d` to start services
2. Pull Ollama models
3. Test API health endpoint
4. Verify PostgreSQL connection

### Short-term (Next development phase)
1. Implement SQLAlchemy database models
2. Create Alembic migrations
3. Build pricing engine core logic
4. Develop archetype loader service
5. Create API endpoints for scoping

---

## Notes

- All context documentation is in `docs/` and Archon MCP
- Archive of old Node.js code preserved in `archive/`
- Environment variables configured in `.env.example`
- Ready for Phase 1: Core Implementation

**Status**: Phase 0 infrastructure complete, ready for service startup and testing.
