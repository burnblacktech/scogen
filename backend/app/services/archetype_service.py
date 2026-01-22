"""
Archetype Service - The Asset Pipeline
Loads RFC JSON files and hydrates them into database requirements
Traceability: Priority 2
"""
import json
import os
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.config import settings
from app.db.models import Project, Requirement
from app.schemas.archetype import (
    ArchetypeDefinition,
    ArchetypeFeature,
    ApplyArchetypeRequest,
    ApplyArchetypeResponse
)
from app.core.logging import get_logger

logger = get_logger("archetype_service")

# Base path relative to this file (app/services/archetype_service.py -> backend/)
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LIBRARY_PATH = os.path.join(BACKEND_DIR, "library", "archetypes")
MODULES_PATH = os.path.join(BACKEND_DIR, "library", "modules")


class ArchetypeService:
    """
    The Content Injection System
    Manages archetype loading and project hydration
    """
    
    def list_available_modules(self) -> List[ArchetypeFeature]:
        """
        Scans the modules folder and returns valid atomic modules
        """
        modules = []
        if not os.path.exists(MODULES_PATH):
            os.makedirs(MODULES_PATH)
            return modules
            
        for filename in os.listdir(MODULES_PATH):
            if filename.endswith(".json"):
                path = os.path.join(MODULES_PATH, filename)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        module = ArchetypeFeature(**data)
                        modules.append(module)
                        logger.info(f"📦 Loaded atomic module: {module.title} ({module.id})")
                except Exception as e:
                    logger.error(f"❌ Error loading module {filename}: {e}")
        return modules

    def get_module_by_id(self, module_id: str) -> Optional[ArchetypeFeature]:
        """Finds a specific module by ID"""
        for module in self.list_available_modules():
            if module.id == module_id:
                return module
        return None

    def configure_project(self, project_context: str, archetype: ArchetypeDefinition) -> ArchetypeDefinition:
        """
        The Swapper Logic (The Car Configurator)
        Dynamically adjusts the archetype based on project context.
        """
        logger.info(f"🛠️ Configuring Archetype '{archetype.name}' for context: '{project_context}'")
        context_lower = project_context.lower()
        
        # Performance optimization: Load all modules once for this configuration session
        available_modules = self.list_available_modules()
        modules_map = {m.id: m for m in available_modules}
        
        # Industry Detection & Swapping
        # 1. Real Estate Swap
        if "real estate" in context_lower or "property" in context_lower:
            re_module = modules_map.get("MOD_LEADS_RE_01")
            if re_module:
                self._replace_module_in_archetype(archetype, "Leads", re_module)

        # 2. OTP Auth Swap
        if "mobile" in context_lower or "otp" in context_lower:
            otp_module = modules_map.get("MOD_AUTH_OTP_01")
            if otp_module:
                self._replace_module_in_archetype(archetype, "Authentication", otp_module)
                
        return archetype

    def _replace_module_in_archetype(self, archetype: ArchetypeDefinition, category: str, new_module: ArchetypeFeature):
        """Internal helper to swap features by category"""
        original_features = archetype.features
        new_features = []
        replaced = False
        
        for feat in original_features:
            if feat.category == category:
                print(f"🔄 Swapping {category}: '{feat.title}' -> '{new_module.title}'")
                new_features.append(new_module)
                replaced = True
            else:
                new_features.append(feat)
        
        if not replaced:
            logger.info(f"➕ Adding new module for category {category}: {new_module.title}")
            new_features.append(new_module)
            
        archetype.features = new_features
        # Update project base hours if needed (assuming sum of feature hours)
        archetype.base_hours = sum(f.standard_hours for f in new_features)

    def list_available_archetypes(self) -> List[ArchetypeDefinition]:
        """
        Scans the library folder and returns valid archetypes
        
        Returns:
            List of validated archetype definitions
        """
        archetypes = []
        
        # Ensure library directory exists
        if not os.path.exists(LIBRARY_PATH):
            os.makedirs(LIBRARY_PATH)
            logger.info(f"📁 Created archetype library at {LIBRARY_PATH}")
            return archetypes
        
        # Scan for JSON files
        for filename in os.listdir(LIBRARY_PATH):
            if filename.endswith(".json"):
                path = os.path.join(LIBRARY_PATH, filename)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        # Validate against Pydantic schema
                        archetype = ArchetypeDefinition(**data)
                        archetypes.append(archetype)
                        logger.info(f"✅ Loaded archetype: {archetype.name} ({archetype.id})")
                except Exception as e:
                    logger.error(f"❌ Error loading {filename}: {e}")
        
        return archetypes
    
    def get_archetype_by_id(self, archetype_id: str) -> Optional[ArchetypeDefinition]:
        """
        Finds a specific archetype by ID
        
        Args:
            archetype_id: Archetype identifier
            
        Returns:
            ArchetypeDefinition or None if not found
        """
        all_archetypes = self.list_available_archetypes()
        for archetype in all_archetypes:
            if archetype.id == archetype_id:
                return archetype
        return None
    
    def apply_archetype_to_project(
        self,
        db: Session,
        request: ApplyArchetypeRequest
    ) -> ApplyArchetypeResponse:
        """
        The Hydration Logic
        
        Steps:
        1. Load archetype from library
        2. Filter features based on variance responses
        3. Insert requirements into database
        
        Args:
            db: Database session
            request: Archetype application request
            
        Returns:
            ApplyArchetypeResponse with results
            
        Raises:
            ValueError: If archetype or project not found
        """
        print(f"🌊 Hydration Protocol Initiated for Project: {request.project_id}")
        # 1. Load Archetype
        archetype = self.get_archetype_by_id(request.archetype_id)
        if not archetype:
            logger.error(f"❌ Archetype '{request.archetype_id}' not found")
            raise ValueError(f"Archetype '{request.archetype_id}' not found")
        
        # Verify project exists
        project = db.query(Project).filter(Project.id == UUID(request.project_id)).first()
        if not project:
            logger.error(f"❌ Project '{request.project_id}' not found")
            raise ValueError(f"Project '{request.project_id}' not found")
        
        logger.info(f"🏗️ Applying {archetype.name} to {project.name}. Points: {len(archetype.features)}")
        
        # --- NEW: Configurator Step ---
        # If project has a description, use it as context for automatic swapping
        project_context = project.description or ""
        archetype = self.configure_project(project_context, archetype)
        # -----------------------------
        
        from app.services.variance_service import VarianceService
        variance_service = VarianceService()
        
        # 2. Neural Synthesis: Mutate standard chassis based on responses
        synthesized_features = variance_service.resolve_blueprint(archetype, request.variance_responses)
        
        # 3. Create Requirements from Synthesized Features
        new_requirements = []
        total_hours = 0.0
        
        for feat in synthesized_features:
            feat_id = feat.id
            # Map complexity to score
            complexity_map = {
                "LOW": 1.0,
                "MEDIUM": 1.2,
                "HIGH": 1.5,
                "EXTREME": 2.0
            }
            complexity_score = complexity_map.get(feat.complexity, 1.0)
            
            # INJECTING THE DNA - Both Nerves and Body
            traceability_meta = {}
            
            if feat.technical_mapping:
                traceability_meta["nerves"] = feat.technical_mapping.dict(exclude_none=True)
            
            if feat.asset_source:
                traceability_meta["body"] = feat.asset_source.dict(exclude_none=True)
            
            req = Requirement(
                project_id=UUID(request.project_id),
                archetype_ref=f"{archetype.id}::{feat.id}",
                title=feat.title,
                description=feat.description,
                acceptance_criteria=feat.acceptance_criteria,
                
                # INSTALLING THE COMPLETE DNA (Nerves + Body)
                traceability_meta=traceability_meta,
                
                complexity_score=complexity_score,
                estimated_hours=feat.standard_hours,
                constraints={
                    "category": feat.category,
                    "archetype_version": archetype.version,
                    "tech_stack": archetype.tech_stack
                }
            )
            new_requirements.append(req)
            total_hours += feat.standard_hours
        
        # 5. Bulk Insert into Database
        logger.info(f"💾 Inserting {len(new_requirements)} requirements...")
        db.add_all(new_requirements)
        logger.info("📡 Committing to DB...")
        db.commit()
        logger.info("✅ Hydration Complete.")
        
        logger.info(f"✅ Hydrated project {request.project_id} with {len(new_requirements)} requirements")
        
        return ApplyArchetypeResponse(
            status="SUCCESS",
            requirements_added=len(new_requirements),
            project_id=request.project_id,
            archetype_id=archetype.id,
            total_hours=total_hours,
            message=f"Successfully added {len(new_requirements)} requirements from {archetype.name}"
        )
    
    def get_archetype_summary(self, archetype_id: str) -> dict:
        """
        Get summary statistics for an archetype
        
        Args:
            archetype_id: Archetype identifier
            
        Returns:
            Summary dict with stats
        """
        archetype = self.get_archetype_by_id(archetype_id)
        if not archetype:
            return {"error": "Archetype not found"}
        
        return {
            "id": archetype.id,
            "name": archetype.name,
            "version": archetype.version,
            "total_features": len(archetype.features),
            "total_hours": archetype.base_hours,
            "variance_points": len(archetype.variance_points),
            "tech_stack": archetype.tech_stack,
            "categories": list(set(f.category for f in archetype.features))
        }
