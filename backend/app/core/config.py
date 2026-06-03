# config.py — central place for all app-wide settings.
# Changing a value here affects the whole backend — no hunting through files.

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "CampusSphere API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # SQLite database file lives in the backend/ folder.
    # "sqlite:///./campussphere.db" means: current directory, file called campussphere.db
    DATABASE_URL: str = "sqlite:///./campussphere.db"

    # Placeholder — swap this for a real secret in production.
    SECRET_KEY: str = "change-me-before-going-to-production"

    class Config:
        env_file = ".env"  # load overrides from a .env file if present


# Single shared instance — import `settings` anywhere in the app.
settings = Settings()
