"""
Airlock Service - The IP Protection Layer
Traceability: Priority 4
Implements the "Slice & Zip Protocol" to prevent IP leakage

Core Concept:
- Freelancers never get Git access
- Scogen acts as a Vending Machine
- Clones full repo internally
- Slices only the needed module
- Injects governance files (linters, rules)
- Returns a secure ZIP bundle

The Frankenstein Defense: Workers get organs, not the whole body.
"""
import os
import shutil
import uuid
import zipfile
import tempfile
from typing import Optional
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger("airlock_service")

# Optional Git support (not required for MVP testing)
try:
    from git import Repo  # type: ignore
    GIT_AVAILABLE = True
except ImportError:
    GIT_AVAILABLE = False
    logger.warning("⚠️ GitPython not installed - using dummy assets only")


class AirlockService:
    """
    The Code Vending Machine
    Securely distributes code slices without exposing the full repository
    """
    
    def __init__(self):
        """Initialize the airlock workspace"""
        # DYNAMIC PATH: Works on Windows (AppData/Local/Temp) and Linux (/tmp)
        self.workspace_dir = os.path.join(tempfile.gettempdir(), "scogen_airlock")
        
        # Ensure workspace exists
        if not os.path.exists(self.workspace_dir):
            os.makedirs(self.workspace_dir)
            logger.info(f"📁 Created airlock workspace at {self.workspace_dir}")
    
    def generate_work_bundle(
        self,
        task_id: str,
        module_path: str,
        include_tests: bool = False
    ) -> str:
        """
        The Surgery Process:
        1. Clones the Master Asset Repo (Cached)
        2. Extracts ONLY the target module
        3. Injects Linter/Governance constraints
        4. Zips it up
        5. Returns path to the secure zip
        
        Args:
            task_id: Unique task identifier (e.g., "TSK-101")
            module_path: Path to module within repo (e.g., "auth/login_module")
            include_tests: Whether to include test files
            
        Returns:
            Path to the generated ZIP file
            
        Raises:
            FileNotFoundError: If module doesn't exist
            Exception: If any step of the process fails
        """
        session_id = str(uuid.uuid4())
        session_dir = os.path.join(self.workspace_dir, session_id)
        
        try:
            logger.info(f"🔒 Airlock Session Started: {session_id}")
            logger.info(f"📦 Task: {task_id}")
            logger.info(f"🎯 Module: {module_path}")
            
            # A. Ensure we have the assets (cached or fresh clone)
            self._ensure_assets_available()
            
            # B. Locate the source module
            source_path = os.path.join(self.workspace_dir, "assets_cache", module_path)
            
            if not os.path.exists(source_path):
                raise FileNotFoundError(f"Module not found: {module_path}")
            
            # C. Create the Freelancer Sandbox
            sandbox_dir = os.path.join(session_dir, "src")
            os.makedirs(sandbox_dir)
            print(f"🏗️  Created sandbox: {sandbox_dir}")
            
            # D. Copy ONLY the specific module (The Slice)
            module_name = os.path.basename(module_path)
            destination = os.path.join(sandbox_dir, module_name)
            shutil.copytree(source_path, destination)
            print(f"✂️  Sliced module: {module_name}")
            
            # E. INJECTION: The Governance Layer (Frankenstein Defense)
            # Force these rules into the bundle. Worker cannot ignore them.
            self._inject_governance_files(session_dir, task_id)
            print(f"💉 Injected governance files")
            
            # F. Add README with instructions
            self._inject_readme(session_dir, task_id, module_path)
            
            # G. Zip it up
            zip_filename = f"scogen_task_{task_id}.zip"
            zip_path = os.path.join(self.workspace_dir, zip_filename)
            
            self._create_zip(session_dir, zip_path)
            logger.info(f"📦 Created bundle: {zip_filename}")
            logger.info(f"✅ Airlock Complete: {zip_path}")
            
            return zip_path
        
        except Exception as e:
            logger.error(f"❌ Airlock Failed: {e}")
            raise e
        
        finally:
            # H. Cleanup: Burn the evidence (temp files)
            if os.path.exists(session_dir):
                try:
                    shutil.rmtree(session_dir)
                    logger.info(f"🔥 Cleaned up session: {session_id}")
                except PermissionError:
                    logger.warning(f"⚠️ Warning: Could not clean up temp dir {session_dir} (Windows Lock)")
    
    def _ensure_assets_available(self):
        """
        Ensures the asset repository is available locally
        In production, this would clone/pull from a private Git repo
        For MVP, creates dummy assets for testing
        """
        cache_dir = os.path.join(self.workspace_dir, "assets_cache")
        
        if os.path.exists(cache_dir):
            print(f"📚 Using cached assets")
            return
        
        # For MVP: Create dummy assets
        # In production: git clone INTERNAL_REPO_URL cache_dir
        print(f"🔨 Creating dummy assets for testing...")
        self._create_dummy_assets(cache_dir)
    
    def _create_dummy_assets(self, cache_dir: str):
        """
        Helper to create fake assets for testing without a real Git repo
        In production, this would be replaced with actual Git clone
        """
        # Create sample modules
        modules = [
            "auth/login_module",
            "auth/registration_module",
            "dashboard/charts_module",
            "leads/crud_module"
        ]
        
        for module_path in modules:
            full_path = os.path.join(cache_dir, module_path)
            os.makedirs(full_path, exist_ok=True)
            
            # Create sample files
            with open(os.path.join(full_path, "service.ts"), "w") as f:
                f.write(f"""// {module_path} - Standard Implementation (80% Reusable)
// This is a SCOGEN Asset - Do not modify core logic

export class Service {{
    async execute() {{
        // Standard implementation
        console.log("Executing {module_path}");
    }}
}}
""")
            
            with open(os.path.join(full_path, "controller.ts"), "w") as f:
                f.write(f"""// {module_path} Controller
import {{ Service }} from './service';

export class Controller {{
    private service = new Service();
    
    async handle(req: any, res: any) {{
        await this.service.execute();
        res.json({{ success: true }});
    }}
}}
""")
            
            with open(os.path.join(full_path, "types.ts"), "w") as f:
                f.write(f"""// {module_path} Types
export interface Config {{
    enabled: boolean;
    timeout: number;
}}
""")
        
        print(f"✅ Created {len(modules)} dummy modules")
    
    def _inject_governance_files(self, target_dir: str, task_id: str):
        """
        Injects strict linter rules and governance constraints
        These files enforce code quality and prevent bad practices
        """
        # 1. ESLint (Strict Mode) - Prevents common mistakes
        eslint_config = {
            "rules": {
                "no-console": "error",
                "no-eval": "error",
                "no-debugger": "error",
                "no-var": "error",
                "prefer-const": "error",
                "no-unused-vars": "error"
            },
            "env": {
                "es2021": True,
                "node": True
            }
        }
        
        import json
        with open(os.path.join(target_dir, ".eslintrc.json"), "w") as f:
            json.dump(eslint_config, f, indent=2)
        
        # 2. The Scogen Rules (For AI Vibe Coders)
        scogen_rules = f"""# SCOGEN CONTEXT - Task {task_id}

## CRITICAL RULES
- DO NOT change database schema
- DO NOT modify core service logic
- DO NOT add new dependencies without approval
- USE TypeScript strict mode
- USE existing types from types.ts

## ALLOWED MODIFICATIONS
- UI styling and layout
- Error messages and validation
- Performance optimizations
- Bug fixes in designated areas

## CODE STYLE
- Use Tailwind CSS for styling
- Follow existing naming conventions
- Add JSDoc comments for new functions
- Write unit tests for new logic

## SUBMISSION REQUIREMENTS
- All tests must pass
- ESLint must show 0 errors
- Code coverage must be >80%

## SECURITY
- Never log sensitive data
- Validate all inputs
- Use parameterized queries
- Follow OWASP guidelines

---
Generated by SCOGEN Airlock System
Violation of these rules will result in automatic rejection.
"""
        
        with open(os.path.join(target_dir, ".scogenrules"), "w") as f:
            f.write(scogen_rules)
        
        # 3. TypeScript Config (Strict Mode)
        tsconfig = {
            "compilerOptions": {
                "strict": True,
                "noImplicitAny": True,
                "strictNullChecks": True,
                "noUnusedLocals": True,
                "noUnusedParameters": True
            }
        }
        
        with open(os.path.join(target_dir, "tsconfig.json"), "w") as f:
            json.dump(tsconfig, f, indent=2)
    
    def _inject_readme(self, target_dir: str, task_id: str, module_path: str):
        """Adds a README with task instructions"""
        readme_content = f"""# SCOGEN Task Bundle: {task_id}

## Module: {module_path}

This is a secure code bundle generated by the SCOGEN Airlock System.

### What's Included
- `src/` - The module code you need to work on
- `.eslintrc.json` - Linter rules (MUST pass)
- `.scogenrules` - Task constraints (READ CAREFULLY)
- `tsconfig.json` - TypeScript configuration

### Getting Started
1. Extract this ZIP to your workspace
2. Run `npm install` (if needed)
3. Read `.scogenrules` for task-specific constraints
4. Make your changes in `src/`
5. Run `npm run lint` to verify compliance
6. Run `npm test` to verify functionality
7. Submit your changes via SCOGEN platform

### Important Notes
- You are working on a SLICE of the codebase
- Do NOT attempt to access other modules
- Follow the governance rules strictly
- All submissions are automatically validated

### Support
If you have questions about the task requirements, contact your task coordinator.

---
**SCOGEN Airlock System** - Protecting IP while enabling collaboration
"""
        
        with open(os.path.join(target_dir, "README.md"), "w") as f:
            f.write(readme_content)
    
    def _create_zip(self, source_dir: str, output_path: str):
        """
        Creates a ZIP archive of the source directory
        
        Args:
            source_dir: Directory to zip
            output_path: Path for the output ZIP file
        """
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(source_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Archive name should be relative to source_dir
                    arcname = os.path.relpath(file_path, start=source_dir)
                    zipf.write(file_path, arcname)
    
    def list_available_modules(self) -> list:
        """
        Lists all available modules in the asset cache
        
        Returns:
            List of module paths
        """
        self._ensure_assets_available()
        
        cache_dir = os.path.join(self.workspace_dir, "assets_cache")
        modules = []
        
        for root, dirs, files in os.walk(cache_dir):
            if files:  # Has files, likely a module
                rel_path = os.path.relpath(root, cache_dir)
                if rel_path != ".":
                    modules.append(rel_path)
        
        return modules
    
    def cleanup_old_bundles(self, max_age_hours: int = 24):
        """
        Removes old ZIP bundles to free up disk space
        
        Args:
            max_age_hours: Maximum age of bundles to keep
        """
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        removed_count = 0
        for filename in os.listdir(self.workspace_dir):
            if filename.endswith(".zip"):
                file_path = os.path.join(self.workspace_dir, filename)
                file_age = current_time - os.path.getmtime(file_path)
                
                if file_age > max_age_seconds:
                    os.remove(file_path)
                    removed_count += 1
        
        print(f"🧹 Cleaned up {removed_count} old bundles")
        return removed_count
