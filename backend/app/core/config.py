# config.py — central place for all app-wide settings.
# Changing a value here affects the whole backend — no hunting through files.

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "CampusSphere API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Local dev:   SQLite file in backend/ folder (no setup needed).
    # Production:  Set DATABASE_URL to your PostgreSQL connection string.
    #              Railway sets this automatically when you add a Postgres plugin.
    #              Format: postgresql://user:password@host:5432/dbname
    DATABASE_URL: str = "sqlite:///./campussphere.db"

    # Placeholder — swap this for a real secret in production.
    SECRET_KEY: str = "change-me-before-going-to-production"

    class Config:
        env_file = ".env"  # load overrides from a .env file if present


# Single shared instance — import `settings` anywhere in the app.
settings = Settings()
