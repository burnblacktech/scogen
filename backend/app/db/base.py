"""
Database Connection Setup
Handles SQLAlchemy engine, session management, and dependency injection for FastAPI
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Construct the Database URL
# Format: postgresql://user:password@host:port/database
SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)

# Create SQLAlchemy engine
# echo=True enables SQL query logging (disable in production)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,  # Set to False in production
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,  # Connection pool size
    max_overflow=20  # Max connections beyond pool_size
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for all models
Base = declarative_base()


def get_db():
    """
    Dependency for FastAPI routes
    Yields a database session and ensures cleanup
    
    Usage:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
