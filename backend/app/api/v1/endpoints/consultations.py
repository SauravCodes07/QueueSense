"""
Consultations endpoint — start and complete consultation sessions.

Server timestamps are authoritative. The doctor's local clock is never used.
duration_seconds is computed from (ended_at - started_at).total_seconds()

After every completion:
  1. duration_seconds is computed
  2. doctor.ema_duration_seconds is updated
  3. ETAs for all WAITING patients are recalculated
  4. SSE broadcast to all channel subscribers
"""
import math
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles
from app.core.enums import UserRole, QueueStatus, AuditActionType
from app.models import User, QueueEntry, ConsultationSession, Doctor
from app.services.queue_service import update_cached_etas, get_ordered_queue, validate_status_transition
from app.services.audit_service import write_audit_event
from app.services.sse_service import broadcast_queue_update
from app.core.config import settings

router = APIRouter()


def _build_snapshot(doctor_id: int, db: Session, etas: list[dict]) -> list[dict]:
    """Build a queue snapshot for SSE broadcast."""
    entries = get_ordered_queue(doctor_id, db)
    eta_map = {e["queue_entry_id"]: e for e in etas}
    snapshot = []
    for i, entry in enumerate(entries):
        eta = eta_map.get(entry.id, {})
        eta_low = eta.get("eta_low_seconds", 0)
        eta_high = eta.get("eta_high_seconds", 0)
        snapshot.append({
            "id": entry.id,
            "token": entry.patient.token if entry.patient else "?",
            "patient_name": entry.patient.name if entry.patient else "?",
            "position": i + 1,
            "status": entry.status.value,
            "priority": entry.priority_level.value,
            "eta_low_minutes": math.ceil(eta_low / 60) if eta_low else None,
            "eta_high_minutes": math.ceil(eta_high / 60) if eta_high else None,
        })
    return snapshot


class StartConsultationRequest(BaseModel):
    queue_entry_id: int


@router.post("/start")
def start_consultation(
    body: StartConsultationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DOCTOR)),
):
    """
    Start a consultation for the next patient in the queue.
    DOCTOR role only — doctors can only start consultations in their own queue.
    
    Validates:
    - Queue entry is WAITING
    - No other IN_PROGRESS entry exists for this doctor
    - This entry belongs to the current doctor's queue
    
    Creates a ConsultationSession with server-side started_at timestamp.
    """
    entry = db.query(QueueEntry).filter(QueueEntry.id == body.queue_entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    # RBAC: Doctor can only start consultations in their own queue
    if not current_user.doctor or current_user.doctor.id != entry.doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only start consultations in your own queue",
        )

    if not validate_status_transition(entry.status, QueueStatus.IN_PROGRESS):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot start consultation for entry with status {entry.status.value}",
        )

    # Check no other IN_PROGRESS entry exists for this doctor (idempotency)
    existing_in_progress = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.doctor_id == entry.doctor_id,
            QueueEntry.status == QueueStatus.IN_PROGRESS,
        )
        .first()
    )
    if existing_in_progress:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A consultation is already in progress. Complete it first.",
        )

    doctor_id = entry.doctor_id
    now = datetime.now(timezone.utc)

    try:
        entry.status = QueueStatus.IN_PROGRESS
        entry.updated_at = now

        session = ConsultationSession(
            queue_entry_id=entry.id,
            doctor_id=doctor_id,
            started_at=now,
        )
        db.add(session)
        db.flush()

        write_audit_event(
            db=db,
            action_type=AuditActionType.CONSULTATION_STARTED,
            entity_type="consultation_session",
            entity_id=session.id,
            metadata={
                "queue_entry_id": entry.id,
                "patient_token": entry.patient.token if entry.patient else None,
                "started_at": now.isoformat(),
            },
            actor_id=current_user.id,
        )

        etas = update_cached_etas(doctor_id, db, reason="consultation_started")
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    snapshot = _build_snapshot(doctor_id, db, etas)
    broadcast_queue_update(doctor_id, "consultation_started", snapshot)

    return {
        "message": "Consultation started",
        "session_id": session.id,
        "queue_entry_id": entry.id,
        "started_at": now.isoformat(),
    }


class CompleteConsultationBody(BaseModel):
    session_id: Optional[int] = None
    queue_entry_id: Optional[int] = None


def _execute_complete_session(session: ConsultationSession, db: Session, current_user: User) -> dict:
    if session.ended_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Consultation already completed",
        )

    entry = session.queue_entry
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated queue entry not found")

    # RBAC: Doctor can only complete their own consultations (unless admin manual complete)
    if current_user.role == UserRole.DOCTOR:
        if not current_user.doctor or current_user.doctor.id != session.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only complete your own consultations",
            )

    doctor_id = session.doctor_id
    now = datetime.now(timezone.utc)

    # Compute duration
    started_at = session.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    duration_seconds = max(1.0, (now - started_at).total_seconds())

    try:
        # Update session
        session.ended_at = now
        session.duration_seconds = duration_seconds

        # Update queue entry status
        entry.status = QueueStatus.COMPLETED
        entry.updated_at = now

        # Update doctor's EMA cache
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if doctor:
            if doctor.ema_duration_seconds is None:
                doctor.ema_duration_seconds = duration_seconds
            else:
                alpha = settings.EMA_ALPHA
                doctor.ema_duration_seconds = (
                    alpha * duration_seconds + (1 - alpha) * doctor.ema_duration_seconds
                )

        write_audit_event(
            db=db,
            action_type=AuditActionType.CONSULTATION_COMPLETED,
            entity_type="consultation_session",
            entity_id=session.id,
            metadata={
                "queue_entry_id": entry.id,
                "patient_token": entry.patient.token if entry.patient else None,
                "duration_seconds": round(duration_seconds, 2),
                "started_at": started_at.isoformat(),
                "ended_at": now.isoformat(),
            },
            actor_id=current_user.id,
        )

        etas = update_cached_etas(doctor_id, db, reason="consultation_completed")
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    snapshot = _build_snapshot(doctor_id, db, etas)
    broadcast_queue_update(doctor_id, "consultation_completed", snapshot)

    return {
        "message": "Consultation completed",
        "session_id": session.id,
        "duration_seconds": round(duration_seconds, 2),
        "duration_minutes": round(duration_seconds / 60, 1),
        "doctor_ema_seconds": round(doctor.ema_duration_seconds, 1) if doctor and doctor.ema_duration_seconds else None,
        "ended_at": now.isoformat(),
    }


@router.post("/complete")
def complete_consultation_by_body(
    body: CompleteConsultationBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DOCTOR)),
):
    """Complete a consultation using session_id or queue_entry_id in body."""
    session = None
    if body.session_id:
        session = db.query(ConsultationSession).filter(ConsultationSession.id == body.session_id).first()
    elif body.queue_entry_id:
        session = db.query(ConsultationSession).filter(ConsultationSession.queue_entry_id == body.queue_entry_id).first()
    
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation session not found")
    
    return _execute_complete_session(session, db, current_user)


@router.post("/{session_id}/complete")
def complete_consultation(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DOCTOR)),
):
    """
    Complete a consultation by path session_id.
    DOCTOR role only — doctors can only complete their own consultations.
    """
    session = db.query(ConsultationSession).filter(ConsultationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation session not found")

    return _execute_complete_session(session, db, current_user)


@router.post("/{session_id}/manual-complete")
def manual_complete_consultation(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Admin override: manually complete a consultation that the doctor
    forgot to complete. Heavily audited.
    ADMIN role only.
    """
    session = db.query(ConsultationSession).filter(ConsultationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation session not found")

    if session.ended_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Consultation already completed",
        )

    entry = session.queue_entry
    doctor_id = session.doctor_id
    now = datetime.now(timezone.utc)
    started_at = session.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    duration_seconds = (now - started_at).total_seconds()

    try:
        session.ended_at = now
        session.duration_seconds = duration_seconds
        session.manually_completed_by = current_user.id

        if entry:
            entry.status = QueueStatus.COMPLETED
            entry.updated_at = now

        write_audit_event(
            db=db,
            action_type=AuditActionType.CONSULTATION_MANUAL_COMPLETE,
            entity_type="consultation_session",
            entity_id=session.id,
            metadata={
                "queue_entry_id": entry.id if entry else None,
                "duration_seconds": round(duration_seconds, 2),
                "manually_completed_by": current_user.id,
                "note": "Admin manual override",
            },
            actor_id=current_user.id,
        )

        etas = update_cached_etas(doctor_id, db, reason="consultation_completed")
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    snapshot = _build_snapshot(doctor_id, db, etas)
    broadcast_queue_update(doctor_id, "consultation_completed", snapshot)

    return {
        "message": "Consultation manually completed by admin",
        "session_id": session.id,
        "duration_seconds": round(duration_seconds, 2),
    }
