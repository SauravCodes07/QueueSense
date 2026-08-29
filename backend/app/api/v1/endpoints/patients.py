"""
Patients endpoint — registration and patient-facing wait time.
"""
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_patient_from_token
from app.models import Patient

router = APIRouter()

# Token format: Department-initial + sequence number, e.g., "A-42"
# In a real deployment, this would be configurable per department
def _generate_patient_token(db: Session) -> str:
    """Generate a unique patient queue token."""
    import string
    import random
    from sqlalchemy import func
    
    # Simple format: random letter + number
    while True:
        letter = random.choice(string.ascii_uppercase)
        number = random.randint(1, 999)
        token = f"{letter}-{number}"
        exists = db.query(Patient).filter(Patient.token == token).first()
        if not exists:
            return token


class PatientCreate(BaseModel):
    name: str
    contact: Optional[str] = None  # Phone number — optional


class PatientResponse(BaseModel):
    id: int
    token: str
    name: str
    contact: Optional[str]

    class Config:
        from_attributes = True


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(body: PatientCreate, db: Session = Depends(get_db)):
    """
    Register a new patient and issue a queue token.
    No clinical data stored — only name and optional contact.
    """
    token = _generate_patient_token(db)
    patient = Patient(
        token=token,
        name=body.name,
        contact=body.contact,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{token}/wait-time")
def get_patient_wait_time(token: str, db: Session = Depends(get_db)):
    """
    Get the wait time for a specific patient.
    Patient can ONLY access their own data — enforced by token lookup.
    Returns 401 if the token doesn't exist, 404 if not in an active queue.
    """
    # Authenticate: patient must provide their own token
    patient = get_patient_from_token(token, db)
    
    # Find their most recent active queue entry
    from app.models import QueueEntry
    from app.core.enums import QueueStatus
    from app.services.queue_service import get_ordered_queue
    import math
    
    active_entry = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.patient_id == patient.id,
            QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS]),
        )
        .order_by(QueueEntry.joined_at.desc())
        .first()
    )
    
    if not active_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient is not currently in any active queue",
        )
    
    # Get ordered queue for position information
    ordered = get_ordered_queue(active_entry.doctor_id, db)
    
    # Find position in queue (1-indexed)
    position = None
    for i, entry in enumerate(ordered):
        if entry.id == active_entry.id:
            position = i + 1  # 1-indexed
            break
    
    # Find who is IN_PROGRESS (now serving)
    now_serving_token = None
    for entry in ordered:
        if entry.status == QueueStatus.IN_PROGRESS:
            now_serving_token = entry.patient.token if entry.patient else None
            break
    
    # Count people ahead (excluding IN_PROGRESS — they're being served)
    people_ahead = max(0, (position or 1) - 1)
    if any(e.status == QueueStatus.IN_PROGRESS for e in ordered):
        people_ahead = max(0, people_ahead - 1)
    
    # ETA from cached values
    eta_low_minutes = None
    eta_high_minutes = None
    eta_clock = None
    
    if active_entry.cached_eta_low_seconds is not None:
        from datetime import datetime, timezone, timedelta
        eta_low_minutes = math.ceil(active_entry.cached_eta_low_seconds / 60)
        eta_high_minutes = math.ceil(active_entry.cached_eta_high_seconds / 60)
        eta_time = datetime.now(timezone.utc) + timedelta(
            seconds=(active_entry.cached_eta_low_seconds + active_entry.cached_eta_high_seconds) / 2
        )
        eta_clock = eta_time.strftime("%I:%M %p")
    
    return {
        "token": token,
        "now_serving": now_serving_token,
        "your_position": position,
        "people_ahead": people_ahead,
        "eta_low_minutes": eta_low_minutes,
        "eta_high_minutes": eta_high_minutes,
        "eta_clock": eta_clock,
        "doctor_status": active_entry.doctor.availability_status.value if active_entry.doctor else None,
        "status": active_entry.status.value,
        "reason": active_entry.cached_eta_reason,
    }
