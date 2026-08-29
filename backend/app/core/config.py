import os
import secrets
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./queuesense.db"

    # Security
    SECRET_KEY: str = secrets.token_hex(32)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 8

    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    DEMO_MODE: bool = True

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Business rules
    NO_SHOW_GRACE_MINUTES: int = 7
    ETA_NOTIFICATION_THRESHOLD_MINUTES: int = 5

    # EMA alpha for prediction baseline
    EMA_ALPHA: float = 0.3
    # Default consultation duration (seconds) when no history exists
    DEFAULT_CONSULTATION_DURATION_SECONDS: int = 720  # 12 minutes
    # Number of recent consultations to use for EMA
    EMA_WINDOW_SIZE: int = 10

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        # Allow SQLite for development
        return v

    def get_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
