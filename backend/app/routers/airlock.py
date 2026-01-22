"""
Airlock Router - The Vending Machine API
Exposes endpoints for secure code distribution
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from app.services.airlock_service import AirlockService
import os
from typing import List


router = APIRouter()
service = AirlockService()


@router.get("/generate-bundle/{task_id}")
def generate_task_bundle(
    task_id: str,
    module_path: str = Query(..., description="Path to module (e.g., 'auth/login_module')"),
    include_tests: bool = Query(False, description="Include test files in bundle")
):
    """
    The Vending Machine: Generate Secure Code Bundle
    
    Generates a secure ZIP containing ONLY the code needed for this task,
    plus strict Linter rules and governance files.
    
    **The Slice & Zip Protocol**:
    1. Clones internal asset repository
    2. Extracts only the specified module
    3. Injects governance files (.eslintrc, .scogenrules, etc.)
    4. Creates ZIP bundle
    5. Returns downloadable file
    
    **Security**:
    - Freelancer never sees Git history
    - No access to other modules
    - Governance rules enforced
    - IP protected
    
    Args:
        task_id: Unique task identifier (e.g., "TSK-101")
        module_path: Path to module within repo (e.g., "auth/login_module")
        include_tests: Whether to include test files
        
    Returns:
        ZIP file download containing:
        - src/ - The module code
        - .eslintrc.json - Linter rules
        - .scogenrules - Task constraints
        - tsconfig.json - TypeScript config
        - README.md - Task instructions
        
    Example:
        POST /api/airlock/generate-bundle/TSK-101?module_path=auth/login_module
    """
    try:
        # Generate the secure bundle
        zip_path = service.generate_work_bundle(
            task_id=task_id,
            module_path=module_path,
            include_tests=include_tests
        )
        
        # Serve the file (The Vending Machine Output)
        return FileResponse(
            path=zip_path,
            filename=os.path.basename(zip_path),
            media_type='application/zip',
            headers={
                "Content-Disposition": f"attachment; filename={os.path.basename(zip_path)}"
            }
        )
    
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Module not found: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate bundle: {str(e)}"
        )


@router.get("/available-modules")
def list_available_modules() -> List[str]:
    """
    List Available Modules
    
    Returns a list of all modules available in the asset repository
    that can be bundled for tasks.
    
    Returns:
        List of module paths
        
    Example Response:
        [
            "auth/login_module",
            "auth/registration_module",
            "dashboard/charts_module",
            "leads/crud_module"
        ]
    """
    try:
        modules = service.list_available_modules()
        return modules
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list modules: {str(e)}"
        )


@router.post("/cleanup")
def cleanup_old_bundles(max_age_hours: int = Query(24, description="Maximum age in hours")):
    """
    Cleanup Old Bundles
    
    Removes old ZIP bundles to free up disk space.
    Should be run periodically (e.g., daily cron job).
    
    Args:
        max_age_hours: Maximum age of bundles to keep (default: 24 hours)
        
    Returns:
        Number of bundles removed
    """
    try:
        removed_count = service.cleanup_old_bundles(max_age_hours)
        return {
            "status": "success",
            "removed_count": removed_count,
            "message": f"Cleaned up {removed_count} old bundles"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cleanup failed: {str(e)}"
        )


@router.get("/health")
def airlock_health_check():
    """
    Airlock Health Check
    
    Verifies that the airlock system is operational.
    
    Returns:
        Health status
    """
    try:
        # Check if workspace is accessible
        import os
        from app.services.airlock_service import WORKSPACE_DIR
        
        workspace_exists = os.path.exists(WORKSPACE_DIR)
        workspace_writable = os.access(WORKSPACE_DIR, os.W_OK) if workspace_exists else False
        
        # Check available modules
        modules = service.list_available_modules()
        
        return {
            "status": "healthy" if workspace_exists and workspace_writable else "degraded",
            "workspace_exists": workspace_exists,
            "workspace_writable": workspace_writable,
            "available_modules": len(modules),
            "workspace_path": WORKSPACE_DIR
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
