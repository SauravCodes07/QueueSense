"""
Authentication endpoint.
POST /auth/login  → JWT access token for staff
POST /auth/logout → (client-side only for now; future: token blocklist)
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.models import User

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a staff member and return a JWT access token.
    Patients do NOT use this endpoint — they use the patient token system.
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role.value,
            "name": user.name,
        }
    )

    # Include doctor_id if this user is a doctor
    doctor_id = None
    if user.doctor:
        doctor_id = user.doctor.id

    return LoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "doctor_id": doctor_id,
        },
    )


@router.post("/logout")
def logout():
    """
    Logout. Client-side: discard the token.
    Future: add token to a server-side blocklist.
    """
    return {"message": "Logged out successfully"}


@router.post("/patient-token")
def patient_auth(patient_token: str, db: Session = Depends(get_db)):
    """
    Lightweight patient authentication — verify a queue token exists.
    Returns the patient's safe public info.
    A patient token can ONLY access that patient's own data.
    """
    from app.models import Patient
    patient = db.query(Patient).filter(Patient.token == patient_token).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid patient token",
        )
    return {
        "token": patient.token,
        "name": patient.name,
        "patient_id": patient.id,
    }
