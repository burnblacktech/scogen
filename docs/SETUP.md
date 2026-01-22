# Phase 0: Ignition - Setup Guide

## Quick Start

### 1. Start Infrastructure

```bash
# Start all services
docker compose up -d

# Check service health
docker compose ps

# View logs
docker compose logs -f
```

### 2. Verify Services

**PostgreSQL** (Port 5432)
```bash
docker exec -it scogen-postgres psql -U scogen -d scogen -c "SELECT version();"
```

**MinIO** (Ports 9000, 9001)
- API: http://localhost:9000
- Console: http://localhost:9001
- Login: minioadmin / changeme

**Ollama** (Port 11434)
```bash
# Pull models
docker exec -it scogen-ollama ollama pull llama3:8b
docker exec -it scogen-ollama ollama pull nomic-embed-text

# Test inference
docker exec -it scogen-ollama ollama run llama3:8b "Hello, Scogen!"
```

**Backend API** (Port 8000)
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

**Frontend** (Port 3000)
- App: http://localhost:3000

---

## Hardware Procurement Checklist

### The Antigravity Rig

**Budget Option** (~₹3,50,000):
- [ ] CPU: AMD Ryzen 9 7900X - ₹40,000
- [ ] Motherboard: X670 - ₹25,000
- [ ] RAM: 128GB DDR5 - ₹45,000
- [ ] GPU: 2x RTX 3090 (used) - ₹1,80,000
- [ ] Storage: 2x 2TB Gen4 NVMe - ₹40,000
- [ ] PSU: 1200W Gold - ₹25,000
- [ ] Case + Cooling - ₹20,000
- [ ] UPS: 1500VA - ₹15,000

**Premium Option** (~₹4,50,000):
- [ ] CPU: AMD Ryzen 9 7950X - ₹55,000
- [ ] Motherboard: X670E - ₹35,000
- [ ] RAM: 128GB DDR5 - ₹45,000
- [ ] GPU: 2x RTX 4090 - ₹3,60,000
- [ ] Storage: 2x 2TB Gen5 NVMe - ₹60,000
- [ ] PSU: 1600W Platinum - ₹35,000
- [ ] Case + Cooling - ₹30,000
- [ ] UPS: 1500VA - ₹25,000

### OS Installation

**Ubuntu Server 22.04 LTS** (Headless)
```bash
# Download ISO
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso

# Create bootable USB
# Install with minimal packages
# Enable SSH during installation
```

---

## Local Development (Without Docker)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
cp ../.env.example ../.env
# Edit .env with local settings

# Run backend
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Troubleshooting

### Docker Issues

**Services won't start:**
```bash
# Check Docker daemon
docker info

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d
```

**GPU not detected in Ollama:**
```bash
# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### Database Issues

**Can't connect to PostgreSQL:**
```bash
# Check if running
docker compose ps postgres

# View logs
docker compose logs postgres

# Reset database
docker compose down -v
docker compose up -d postgres
```

---

## Next Steps

1. ✅ Infrastructure running
2. ✅ RFC-001-CRM-STANDARD created
3. ⏳ Implement database models (SQLAlchemy)
4. ⏳ Create pricing engine logic
5. ⏳ Build AI interaction layer
6. ⏳ Develop frontend UI

See [docs/README.md](../docs/README.md) for detailed documentation.
