from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./mundial2026.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@matudev.com"
    APP_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"


settings = Settings()