# database.py — sets up the database connection and creates a session factory.
#
# Supports two databases automatically:
#   • SQLite  — used locally (DATABASE_URL starts with "sqlite")
#   • PostgreSQL — used in production on Railway (DATABASE_URL starts with "postgres")
#
# Railway sets DATABASE_URL automatically when you provision a Postgres plugin.
# Locally, config.py defaults to "sqlite:///./campussphere.db".

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

# Railway injects "postgres://..." but SQLAlchemy requires "postgresql://".
# Normalize it here so both forms work.
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

# SQLite needs check_same_thread=False for async FastAPI usage.
# PostgreSQL does not accept that argument — only pass it for SQLite.
_connect_args = {"check_same_thread": False} if _db_url.startswith("sqlite") else {}

engine = create_engine(_db_url, connect_args=_connect_args)

# SessionLocal is a factory: call SessionLocal() to get a fresh DB session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# All SQLAlchemy models will inherit from this Base class.
class Base(DeclarativeBase):
    pass


def get_db():
    """
    FastAPI dependency — yields a database session and closes it when done.

    Usage in a router:
        from app.database import get_db
        from sqlalchemy.orm import Session

        @router.get("/something")
        def read_something(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
