# Scogen: The Agency Operating System

**AI-powered scoping and project management engine for software agencies.**

Scogen converts natural language requirements (voice/text) into frozen technical specifications (RFCs), calculates precise costs based on internal assets, and orchestrates execution via a network of personas and freelancers.

---

## 🏗️ Architecture

### The Anti-Fragile Monolith

- **Backend**: Python + FastAPI (logic & orchestration)
- **Database**: PostgreSQL with pgvector (relational data + AI memory)
- **Storage**: MinIO (S3-compatible, self-hosted)
- **AI Inference**: Self-hosted Ollama (Llama-3) + Whisper (speech-to-text)
- **Frontend**: Next.js (React)
- **Deployment**: Docker + Caddy (reverse proxy)

### Core Philosophy

1. **Defense-First**: Prioritizes limiting liability and protecting margins
2. **The Vault**: Requirements are immutable 'frozen' assets, not chat logs
3. **Self-Hosted**: Runs on local hardware for data sovereignty

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Node.js 18+ (for frontend)
- Docker & Docker Compose (recommended)
- NVIDIA GPU (for Ollama/Whisper)

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/burnblacktech/scogen.git
cd scogen

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialize database
alembic upgrade head

# Start backend
uvicorn app.main:app --reload

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

---

## 📖 Key Workflows

### 1. Ingestion: The Silent Listener
Captures intent, filters noise, and assesses 'Maturity Score'

### 2. Scoping
Maps intent to 'Standard Archetypes' (80% reusable) + 'Variance' (20% custom)

### 3. Pricing: Shadow Pricing Engine
Calculates:
- **Client Price** (value-based)
- **Internal Cost** (asset-based)
- **Margin Guard** (enforces minimum 40% margin)

### 4. Execution
Breaks scope into atomic tasks (<4 hours) with strict Input/Output contracts

---

## 🛠️ Hardware Requirements

### Minimum (Development)
- CPU: 8 cores
- RAM: 32GB
- GPU: RTX 3090 (24GB VRAM)
- Storage: 500GB NVMe SSD

### Recommended (Production)
- CPU: AMD Ryzen 9 7950X (16 cores) or Threadripper
- RAM: 128GB DDR5
- GPU: 2x RTX 4090 (48GB total VRAM)
- Storage: 2x 2TB NVMe SSD (RAID 1)
- UPS: 1500VA minimum

---

## 📚 Documentation

- **Architecture**: See `docs/architecture.md`
- **API Reference**: http://localhost:8000/docs (when running)
- **Database Schema**: See `docs/database-schema.md`
- **Pricing Engine**: See `docs/pricing-algorithm.md`
- **Deployment Guide**: See `docs/deployment.md`

---

## 🔧 Development

### Backend Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── api/                 # API routes
│   ├── core/                # Business logic
│   ├── db/                  # Database models & migrations
│   ├── services/            # External services (Ollama, MinIO)
│   └── schemas/             # Pydantic schemas
└── tests/                   # Pytest tests
```

### Frontend Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   ├── lib/                 # Utilities & API client
│   └── types/               # TypeScript types
└── public/                  # Static assets
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

---

## 🐳 Docker Services

```yaml
services:
  - postgres     # PostgreSQL database
  - minio        # S3-compatible storage
  - ollama       # LLM inference
  - backend      # FastAPI application
  - frontend     # Next.js application
  - caddy        # Reverse proxy
```

---

## 🔐 Security

- JWT-based authentication
- CORS protection
- Input sanitization
- SQL injection prevention (SQLAlchemy ORM)
- Rate limiting
- Audit logging

---

## 📊 Database Schema

### Core Tables

- **projects**: The Vault (frozen scopes)
- **requirements**: The Atoms (granular requirements)
- **constraints_registry**: The Moat (learned constraints)
- **audit_logs**: The Evidence (immutable audit trail)

See `docs/database-schema.md` for complete schema.

---

## 🤝 Contributing

This is a learning project. Feel free to fork and experiment!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

Built with:
- FastAPI
- PostgreSQL + pgvector
- Ollama
- Whisper
- Next.js
- MinIO

---

## 📞 Support

For issues and questions:
- GitHub Issues: https://github.com/burnblacktech/scogen/issues
- Documentation: See `docs/` directory

---

**Happy Scoping!** 🚀
