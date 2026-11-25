from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database import get_db
from backend import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

# Bcrypt: seguro, estándar y rápido en entornos serverless
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Compatibilidad con cuentas creadas antes de la migración a bcrypt ──────────
def _legacy_sha256_verify(plain_password: str, stored_hash: str) -> bool:
    """Verifica hashes del formato antiguo: salt$sha256_hex"""
    try:
        parts = stored_hash.split("$")
        if len(parts) != 2:
            return False
        salt, expected = parts
        # Debe ser hex de 64 chars (SHA-256) para distinguirlo de bcrypt
        if len(expected) != 64:
            return False
        val = (plain_password + salt).encode("utf-8")
        for _ in range(25000):
            val = hashlib.sha256(val + salt.encode("utf-8")).digest()
        return secrets.compare_digest(val.hex(), expected)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Intenta bcrypt primero (cuentas nuevas).
    Si el hash no es bcrypt (no empieza por $2b$), prueba el formato SHA-256 legado.
    """
    try:
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            # Hash bcrypt normal
            return pwd_context.verify(plain_password, hashed_password)
        else:
            # Formato legado SHA-256: salt$hex
            return _legacy_sha256_verify(plain_password, hashed_password)
    except Exception:
        return False


def rehash_to_bcrypt_if_needed(plain_password: str, stored_hash: str) -> Optional[str]:
    """
    Si el hash almacenado es SHA-256 legado y la contraseña es correcta,
    devuelve un nuevo hash bcrypt para migrar el registro.
    """
    if stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"):
        return None  # Ya es bcrypt, no hay que migrar
    if _legacy_sha256_verify(plain_password, stored_hash):
        return get_password_hash(plain_password)
    return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    user = db.query(models.User).filter(models.User.email == email).first()
    return user

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales de autenticación",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return user

def require_admin(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    if current_user.role != models.UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido. Se requieren permisos de administrador."
        )
    return current_user
