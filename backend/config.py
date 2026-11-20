import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "FRANCO'S POLLO - Plataforma Integral"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "francos_pollo_super_secret_jwt_key_2026_secure_hash")
    ALGORITHM: str = "HS256"
    
    # Expiración estricta de seguridad: 5 minutos
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 5
    
    # Neon PostgreSQL database URL (use postgresql+psycopg2:// driver)
    raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./francos_pollo.db")
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg2://"):
        raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        
    DATABASE_URL: str = raw_db_url
    
    # Official business WhatsApp
    WHATSAPP_NUMBER: str = os.getenv("WHATSAPP_NUMBER", "573206565410")
    PHONE_NUMBER: str = os.getenv("PHONE_NUMBER", "+57 320 656 5410")

settings = Settings()
