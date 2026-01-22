# Phase 9: The Sentinel (Observability)

## Objective
To enable "The Panopticon" (The All-Seeing Eye) for the Scogen Platform. This phase shifts the system from a "Black Box" to a transparent, self-monitoring organism. It ensures the "Anti-Fragile Monolith" remains healthy without constant human supervision.

---

## Architecture: The Three Layers

### 1. The Pulse (Infrastructure Health)
**Component**: `HealthService` (`backend/app/services/health_service.py`)
**Role**: The Doctor. Checks vital signs to prevent silent failures.
**Vitals Monitored**:
*   **Database**: Connectivity check (`SELECT 1`).
*   **AI Brain**: Probes the Ollama API to ensure the LLM is responding.
*   **Disk Space**: Monitors availability for MinIO/Airlock operations.
*   **Memory**: Watches RAM usage to prevent OOM kills in "Potato Mode".

### 2. The Spy (Synthetic Monitoring)
**Component**: `Synthetic Audit` (`backend/scripts/synthetic_audit.py`)
**Role**: The Secret Shopper. A script that pretends to be a user and runs the entire lifecycle.
**Routine**:
1.  **Ingest**: Creates a shadow project.
2.  **Price**: Verifies the Pricing Engine's math (Margin integrity).
3.  **Security**: Probes the "Airlock" with a directory traversal attack to ensure the shield is up.
**Usage**:
```bash
python backend/scripts/synthetic_audit.py
```

### 3. The Panopticon (Visual Dashboard)
**Location**: `/admin` -> **Pulse Tab**
**Features**:
*   Real-time Status Indicators (Green/Red).
*   Resource Gauges for Disk and RAM.
*   "God Mode" visibility into the machine's heartbeat.

---

## Technical Implementation

### Backend
*   **Endpoint**: `GET /api/admin/health`
*   **Response**: JSON report of all components and resources.

### Frontend
*   **UI**: Integrated into the Admin Console (`frontend/src/app/admin/page.tsx`).
*   **Refresh Rate**: Polling every 10 seconds.

---

## Success Metrics
*   **Downtime**: 0 seconds of "Unknown" downtime.
*   **Detection**: System alerts the Admin *before* the Client notices an issue.
*   **Trust**: The Admin can sleep knowing "The Spy" is patrolling.
