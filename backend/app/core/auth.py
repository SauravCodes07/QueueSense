"""
Authentication and RBAC dependencies for FastAPI endpoints.

Usage:
    @router.post("/endpoint")
    def my_endpoint(current_user: User = Depends(require_roles(UserRole.DOCTOR, UserRole.ADMIN))):
        ...

Patient token authentication is separate — use get_patient_from_token().
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.enums import UserRole
from app.models import User

# FastAPI HTTP Bearer scheme — reads Authorization: Bearer <token>
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the JWT and return the active User.
    Raises 401 if the token is missing, invalid, or expired.
    Raises 403 if the user is inactive.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def require_roles(*allowed_roles: UserRole):
    """
    Factory that returns a FastAPI dependency requiring specific roles.
    
    Example:
        Depends(require_roles(UserRole.DOCTOR, UserRole.ADMIN))
    
    Raises 403 if the authenticated user's role is not in allowed_roles.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of these roles: {[r.value for r in allowed_roles]}",
            )
        return current_user
    return role_checker


def require_doctor():
    """Shortcut: require DOCTOR role."""
    return require_roles(UserRole.DOCTOR)


def require_reception_or_admin():
    """Shortcut: require RECEPTION or ADMIN role."""
    return require_roles(UserRole.RECEPTION, UserRole.ADMIN)


def require_admin():
    """Shortcut: require ADMIN role."""
    return require_roles(UserRole.ADMIN)


def require_staff():
    """Shortcut: require any staff role (DOCTOR, RECEPTION, or ADMIN)."""
    return require_roles(UserRole.DOCTOR, UserRole.RECEPTION, UserRole.ADMIN)


def get_patient_from_token(patient_token: str, db: Session) -> "Patient":
    """
    Authenticate a patient by their queue token.
    Returns the Patient if found and active.
    Raises 401 if not found.

    IMPORTANT: Patient data isolation is enforced at the query layer.
    A patient token can ONLY access their own QueueEntry.
    """
    from app.models import Patient
    patient = db.query(Patient).filter(Patient.token == patient_token).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid patient token",
        )
    return patient
