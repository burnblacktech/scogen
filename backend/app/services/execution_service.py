"""
Execution Service - The Factory Floor
Traceability: Priority 7
"""
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.models import Project, Task, TaskStatus, ProjectStatus

class ExecutionService:
    
    def launch_project(self, db: Session, project_id: str):
        """
        The Big Red Button.
        Converts a FROZEN project into ACTIVE tasks.
        """
        project = db.query(Project).filter(Project.id == UUID(project_id)).first()
        if not project:
            raise ValueError(f"Project '{project_id}' not found")
        
        if project.status != ProjectStatus.FROZEN:
            raise ValueError("Must Freeze scope before Launching execution.")

        tasks_created = []

        # 1. Loop through Requirements
        for req in project.requirements:
            # logic: 1 Req = 1 Task (Simplification for MVP)
            # In advanced version, AI splits big reqs here.
            
            # Extract asset path from the metadata we stored earlier
            repo_path = "modules/generic"
            if req.traceability_meta and "body" in req.traceability_meta:
                 repo_path = req.traceability_meta["body"].get("path", "modules/generic")

            new_task = Task(
                project_id=project.id,
                requirement_id=req.id,
                persona_label="Mid-Level Dev", # Default assignment logic
                status=TaskStatus.PENDING,
                agreed_cost=req.estimated_hours * 800, # Using Internal Rate
                time_limit_hours=int(req.estimated_hours * 1.5), # Buffer
                technical_context={
                    "airlock_path": repo_path,
                    "nerves": req.traceability_meta.get("nerves", {}) if req.traceability_meta else {}
                }
            )
            tasks_created.append(new_task)

        # 2. Save Tasks
        db.add_all(tasks_created)
        
        # 3. Update Project Status
        project.status = ProjectStatus.ACTIVE
        db.commit()

        print(f"🏭 Factory Launched for Project {project_id}. {len(tasks_created)} tasks generated.")

        return {
            "status": "LAUNCHED",
            "tasks_generated": len(tasks_created)
        }
    
    def get_project_tasks(self, db: Session, project_id: str):
        """
        Fetch all tasks for a project
        """
        return db.query(Task).filter(Task.project_id == UUID(project_id)).all()
