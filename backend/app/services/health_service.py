import shutil
import psutil # pip install psutil
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings
import requests

class HealthService:
    
    def check_vitals(self, db: Session):
        report = {
            "status": "HEALTHY",
            "components": {},
            "resources": {}
        }
        
        # 1. Database Pulse
        try:
            db.execute(text("SELECT 1"))
            report["components"]["database"] = "ONLINE"
        except Exception as e:
            report["components"]["database"] = f"FAIL: {str(e)}"
            report["status"] = "CRITICAL"

        # 2. Brain Pulse (Ollama)
        try:
            # Using settings.OLLAMA_HOST since OLLAMA_BASE_URL might not be defined in recent config update
            # The config.py showed OLLAMA_HOST = "http://localhost:11434"
            res = requests.get(f"{settings.OLLAMA_HOST}/api/tags", timeout=2)
            if res.status_code == 200:
                report["components"]["ai_brain"] = "ONLINE"
            else:
                report["components"]["ai_brain"] = "UNSTABLE"
        except:
            report["components"]["ai_brain"] = "OFFLINE"
            # AI offline is degraded, not critical for admin ops
            if report["status"] != "CRITICAL":
                report["status"] = "DEGRADED"

        # 3. Disk Space (For Airlock/MinIO)
        try:
            total, used, free = shutil.disk_usage("/")
            free_gb = free // (2**30)
            report["resources"]["disk_free_gb"] = free_gb
            if free_gb < 2:
                report["components"]["disk"] = "CRITICAL_FULL"
                report["status"] = "CRITICAL"
            else:
                report["components"]["disk"] = "OK"
        except Exception as e:
             report["components"]["disk"] = "UNKNOWN"

        # 4. Memory (For Potato Mode)
        try:
            mem = psutil.virtual_memory()
            report["resources"]["ram_used_percent"] = mem.percent
            if mem.percent > 90:
                if report["status"] != "CRITICAL":
                    report["status"] = "DEGRADED"
        except Exception:
             report["resources"]["ram_used_percent"] = 0

        return report
