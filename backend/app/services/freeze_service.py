"""
Freeze Service - The Evidence Chain
Calculates digital fingerprints and locks project scope
Traceability: Priority 6
"""
import hashlib
import os
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from jinja2 import Environment, FileSystemLoader

from app.db.models import Project, ProjectStatus
from app.config import settings
from app.services.artifact_service import ArtifactService
from app.core.logging import get_logger

logger = get_logger("freeze_service")

# Placeholder for MinIO upload logic (Simulated for Potato Mode)
def upload_to_minio(filename, content):
    # Simulate S3 storage by saving to local 'evidence_vault'
    path = os.path.join(os.getcwd(), "evidence_vault", filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding='utf-8') as f:
        f.write(content)
    return f"file:///{path.replace('\\', '/')}" # Return a URI-like path

class FreezeService:
    def __init__(self):
        # Path relative to backend root
        backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        template_dir = os.path.join(backend_root, "templates")
        self.template_env = Environment(loader=FileSystemLoader(template_dir))
        self.artifact_service = ArtifactService()

    def freeze_project(self, db: Session, project_id: str):
        # 1. Fetch Data
        project = db.query(Project).filter(Project.id == UUID(project_id)).first()
        if not project:
            raise ValueError(f"Project '{project_id}' not found")
        
        if project.status == ProjectStatus.FROZEN:
            raise ValueError("Project scope is already frozen and locked.")

        logger.info(f"❄️ Commencing Project Freeze Protocol for: {project.id}")

        # 2. Prepare Data for Artifact Engine
        # Flatten requirements to dictionary so Jinja can read attributes
        reqs_list = []
        for r in project.requirements:
            reqs_list.append({
                "title": r.title,
                "description": r.description,
                "estimated_hours": r.estimated_hours,
                "traceability_meta": r.traceability_meta,
                "constraints": r.constraints
            })

        # 3. Generate Content via Artifact Engine
        narrative = self.artifact_service.generate_executive_narrative(project.name, reqs_list)
        tech_spec = self.artifact_service.compile_technical_spec(reqs_list)
        
        # 4. Render The Premium Briefcase
        try:
            template = self.template_env.get_template("briefcase.html")
        except Exception as e:
            logger.error(f"Failed to load briefcase template: {str(e)}")
            raise RuntimeError(f"Failed to load briefcase template: {str(e)}")

        html_content = template.render(
            project=project,
            generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            business_narrative=narrative,
            tech_spec=tech_spec,
            document_hash="PENDING_CALCULATION"
        )

        # 5. Hash & Seal (The Digital Notary)
        doc_hash = hashlib.sha256(html_content.encode('utf-8')).hexdigest()
        final_html = html_content.replace("PENDING_CALCULATION", doc_hash)

        # 6. Upload to Evidence Vault
        filename = f"BRIEFCASE_{project.id}_{doc_hash[:8]}.html"
        storage_path = upload_to_minio(filename, final_html)

        # 7. Lock Database (Immutable State)
        project.status = ProjectStatus.FROZEN
        project.frozen_scope_hash = doc_hash
        project.frozen_at = datetime.utcnow()
        
        db.commit()
        db.refresh(project)

        logger.info(f"✅ Project {project.id} FROZEN. Sealed with hash: {doc_hash}")

        return {
            "status": "FROZEN",
            "artifact_url": storage_path,
            "hash": doc_hash,
            "timestamp": project.frozen_at.isoformat(),
            "message": "Scope locked. Digital Briefcase generated and sealed."
        }
