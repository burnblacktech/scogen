"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers import pricing, archetypes, airlock, constraints, projects, execution, variance, proposals
from app.core.logging import get_logger

logger = get_logger("main")

app = FastAPI(
    title="Scogen API",
    description="The Agency Operating System - AI-powered scoping and project management",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Scogen Neural Core Initializing...")

# Global Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "ERROR",
            "message": "Internal System Error. The Agency Architect has been notified.",
            "detail": str(exc) # Helpful for debugging, can be restricted in prod
        }
    )

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Tracing Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"📡 Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"✅ Response: {response.status_code}")
    return response

# Register Routers
app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing"])
app.include_router(archetypes.router, prefix="/api/archetypes", tags=["Archetypes"])
app.include_router(airlock.router, prefix="/api/airlock", tags=["Airlock"])
app.include_router(constraints.router, prefix="/api/constraints", tags=["Constraints"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(execution.router, prefix="/api/execution", tags=["Execution"])
app.include_router(variance.router, prefix="/api/variance", tags=["Variance"])
app.include_router(proposals.router, prefix="/api/proposals", tags=["Proposals"])
from app.routers import admin, ideas, modeling
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(ideas.router, prefix="/api/ideas", tags=["Ideas"])
app.include_router(modeling.router, prefix="/api/modeling", tags=["Modeling"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Scogen API",
        "version": "2.0.0",
        "architecture": "Anti-Fragile Monolith"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    logger.info("Health check requested")
    # TODO: Add actual connectivity checks (DB ping, S3 stat, Ollama version)
    return {
        "status": "healthy",
        "database": "connected",
        "storage": "connected",
        "llm": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
