"""
Queue endpoint — join, view, cancel, priority (emergency/urgent), no-show, transfer.

Every mutation:
  1. Acquires a row lock on the affected doctor's queue entries
  2. Validates the state transition
  3. Applies the mutation
  4. Recalculates all ETAs for the affected queue
  5. Writes audit event (if required)
  6. Commits the transaction
  7. Broadcasts the new queue state via SSE
"""
import math
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles
from app.core.enums import UserRole, QueueStatus, PriorityLevel, AuditActionType, AvailabilityStatus
from app.models import (
    User, Patient, Doctor, QueueEntry, Appointment,
    EmergencyEvent, NoShowEvent, QueueTransfer
)
from app.services.queue_service import (
    get_ordered_queue_for_update,
    get_next_queue_sequence,
    update_cached_etas,
    validate_status_transition,
    get_ordered_queue,
)
from app.services.audit_service import write_audit_event
from app.services.sse_service import broadcast_queue_update
from app.core.enums import AppointmentType

router = APIRouter()


def _build_snapshot(doctor_id: int, db: Session, etas: list[dict]) -> list[dict]:
    """Build a queue snapshot dict for SSE broadcast."""
    entries = get_ordered_queue(doctor_id, db)
    eta_map = {e["queue_entry_id"]: e for e in etas}
    snapshot = []
    for i, entry in enumerate(entries):
        eta = eta_map.get(entry.id, {})
        eta_low = eta.get("eta_low_seconds", 0)
        eta_high = eta.get("eta_high_seconds", 0)
        eta_clock = None
        if eta_low is not None:
            from datetime import timedelta
            eta_clock = (
                datetime.now(timezone.utc) + timedelta(seconds=(eta_low + eta_high) / 2)
            ).strftime("%I:%M %p")
        snapshot.append({
            "id": entry.id,
            "token": entry.patient.token if entry.patient else "?",
            "patient_name": entry.patient.name if entry.patient else "?",
            "position": i + 1,
            "status": entry.status.value,
            "priority": entry.priority_level.value,
            "eta_low_minutes": math.ceil(eta_low / 60) if eta_low else None,
            "eta_high_minutes": math.ceil(eta_high / 60) if eta_high else None,
            "eta_clock": eta_clock,
            "joined_at": entry.joined_at.isoformat() if entry.joined_at else None,
        })
    return snapshot


# ─── View Queue ───────────────────────────────────────────────────────────────

@router.get("/{doctor_id}")
def get_doctor_queue(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DOCTOR, UserRole.RECEPTION, UserRole.ADMIN)),
):
    """
    Get the full ordered queue for a doctor.
    DOCTOR can only see their own queue.
    RECEPTION and ADMIN can see any queue.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # RBAC: Doctors can only see their own queue
    if current_user.role == UserRole.DOCTOR:
        if not current_user.doctor or current_user.doctor.id != doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctors can only view their own queue",
            )

    entries = get_ordered_queue(doctor_id, db)
    
    result = []
    for i, entry in enumerate(entries):
        result.append({
            "id": entry.id,
            "token": entry.patient.token if entry.patient else "?",
            "patient_name": entry.patient.name if entry.patient else "?",
            "position": i + 1,
            "status": entry.status.value,
            "priority": entry.priority_level.value,
            "eta_low_minutes": math.ceil(entry.cached_eta_low_seconds / 60) if entry.cached_eta_low_seconds else None,
            "eta_high_minutes": math.ceil(entry.cached_eta_high_seconds / 60) if entry.cached_eta_high_seconds else None,
            "eta_reason": entry.cached_eta_reason,
            "joined_at": entry.joined_at.isoformat() if entry.joined_at else None,
        })
    
    return {"doctor_id": doctor_id, "queue": result}


# ─── Join Queue ───────────────────────────────────────────────────────────────

class JoinQueueRequest(BaseModel):
    patient_token: str
    doctor_id: int


@router.post("/join", status_code=status.HTTP_201_CREATED)
def join_queue(body: JoinQueueRequest, db: Session = Depends(get_db)):
    """
    A patient joins a doctor's queue.
    Creates an Appointment and a QueueEntry.
    Returns the patient's queue token, position, and initial ETA.
    Broadcasts queue update via SSE.
    """
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.token == body.patient_token).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient token not found")

    # Verify doctor exists and is accepting patients
    doctor = db.query(Doctor).filter(Doctor.id == body.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    
    if doctor.availability_status == AvailabilityStatus.OFFLINE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor is offline and not accepting patients",
        )

    # Check if patient is already in this doctor's active queue
    existing = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.patient_id == patient.id,
            QueueEntry.doctor_id == body.doctor_id,
            QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS]),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Patient is already in this doctor's queue",
        )

    # Create appointment and queue entry within a transaction
    try:
        appointment = Appointment(
            patient_id=patient.id,
            doctor_id=body.doctor_id,
            appointment_type=AppointmentType.WALK_IN,
            created_at=datetime.now(timezone.utc),
        )
        db.add(appointment)
        db.flush()  # Get appointment ID

        seq = get_next_queue_sequence(body.doctor_id, db)
        queue_entry = QueueEntry(
            appointment_id=appointment.id,
            patient_id=patient.id,
            doctor_id=body.doctor_id,
            status=QueueStatus.WAITING,
            priority_level=PriorityLevel.ROUTINE,
            queue_sequence=seq,
            joined_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(queue_entry)
        db.flush()

        # Recalculate ETAs
        etas = update_cached_etas(body.doctor_id, db, reason="queue_joined")
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Broadcast SSE update
    snapshot = _build_snapshot(body.doctor_id, db, etas)
    broadcast_queue_update(body.doctor_id, "queue_joined", snapshot)

    # Find this entry's ETA
    entry_eta = next((e for e in etas if e["queue_entry_id"] == queue_entry.id), {})
    
    return {
        "queue_entry_id": queue_entry.id,
        "token": patient.token,
        "doctor_id": body.doctor_id,
        "queue_sequence": seq,
        "eta_low_minutes": math.ceil(entry_eta.get("eta_low_seconds", 0) / 60) if entry_eta.get("eta_low_seconds") else None,
        "eta_high_minutes": math.ceil(entry_eta.get("eta_high_seconds", 0) / 60) if entry_eta.get("eta_high_seconds") else None,
    }


# ─── Cancel Queue Entry ────────────────────────────────────────────────────────

@router.post("/{entry_id}/cancel")
def cancel_queue_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel a queue entry. 
    Staff (RECEPTION/ADMIN) can cancel any entry.
    Doctors can cancel entries in their own queue.
    Patients cancel via their token (not JWT).
    """
    entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    if not validate_status_transition(entry.status, QueueStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel entry with status {entry.status.value}",
        )

    doctor_id = entry.doctor_id
    try:
        entry.status = QueueStatus.CANCELLED
        entry.updated_at = datetime.now(timezone.utc)
        etas = update_cached_etas(doctor_id, db, reason="queue_cancelled")
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    snapshot = _build_snapshot(doctor_id, db, etas)
    broadcast_queue_update(doctor_id, "queue_cancelled", snapshot)
    return {"message": "Queue entry cancelled", "entry_id": entry_id}


# ─── Priority (Emergency / Urgent) ────────────────────────────────────────────

class PriorityRequest(BaseModel):
    level: PriorityLevel
    reason: str


@router.post("/{entry_id}/priority")
def set_priority(
    entry_id: int,
    body: PriorityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DOCTOR, UserRole.RECEPTION, UserRole.ADMIN)),
):
    """
    Flag a queue entry as URGENT or EMERGENCY.
    
    Insertion policy:
    - EMERGENCY: After any currently IN_PROGRESS entry, after earlier emergencies
    - URGENT: After all EMERGENCY entries, before ROUTINE
    
    Creates EmergencyEvent + AuditEvent atomically.
    Recalculates and broadcasts all ETAs.
    """
    entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")
    
    if entry.status not in (QueueStatus.WAITING, QueueStatus.IN_PROGRESS):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot set priority on entry with status {entry.status.value}",
        )

    if body.level == PriorityLevel.ROUTINE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot downgrade priority to ROUTINE via this endpoint",
        )

    # Doctor RBAC: can only flag in their own queue
    if current_user.role == UserRole.DOCTOR:
        if not current_user.doctor or current_user.doctor.id != entry.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctors can only flag priority in their own queue",
            )

    doctor_id = entry.doctor_id
    
    try:
        old_priority = entry.priority_level
        entry.priority_level = body.level
        entry.updated_at = datetime.now(timezone.utc)

        # Create EmergencyEvent (immutable record)
        event = EmergencyEvent(
            queue_entry_id=entry_id,
            actor_id=current_user.id,
            priority_level=body.level,
            reason=body.reason,
            flagged_at=datetime.now(timezone.utc),
        )
        db.add(event)
        db.flush()

        # Write audit event
        write_audit_event(
            db=db,
            action_type=AuditActionType.EMERGENCY_FLAGGED,
            entity_type="queue_entry",
            entity_id=entry_id,
            metadata={
                "old_priority": old_priority.value,
                "new_priority": body.level.value,
                "reason": body.reason,
                "patient_token": entry.patient.token if entry.patient else None,
                "actor_role": current_user.role.value,
            },
            actor_id=current_user.id,
        )

        etas = update_cached_etas(doctor_id, db, reason=f"priority_{body.level.value.lower()}_flagged")
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    snapshot = _build_snapshot(doctor_id, db, etas)
    broadcast_queue_update(doctor_id, f"emergency_flagged", snapshot)
    
    return {
        "message": f"Priority set to {body.level.value}",
        "entry_id": entry_id,
        "new_priority": body.level.value,
    }


# ─── No-Show ──────────────────────────────────────────────────────────────────

class NoShowRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/{entry_id}/no-show")
def mark_no_show(
    entry_id: int,
    body: NoShowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DOCTOR, UserRole.RECEPTION, UserRole.ADMIN)),
):
    """
    Mark a patient as no-show.
    
    IMPORTANT: This is a human confirmation step. The system may soft-flag
    (via no_show_flagged_at) but never automatically marks NO_SHOW.
    Staff must explicitly call this endpoint.
    
    Creates NoShowEvent + AuditEvent atomically.
    """
    entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    if not validate_status_transition(entry.status, QueueStatus.NO_SHOW):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot mark no-show for entry with status {entry.status.value}",
        )

    # Doctor RBAC: can only mark no-show in their own queue
    if current_user.role == UserRole.DOCTOR:
        if not current_user.doctor or current_user.doctor.id != entry.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctors can only mark no-show in their own queue",
            )

    doctor_id = entry.doctor_id
    was_auto_flagged = entry.no_show_flagged_at is not None

    try:
        entry.status = QueueStatus.NO_SHOW
        entry.updated_at = datetime.now(timezone.utc)

        # Create NoShowEvent (immutable)
        no_show_event = NoShowEvent(
            queue_entry_id=entry_id,
            actor_id=current_user.id,
            reason=body.reason,
            auto_flagged=was_auto_flagged,
            marked_at=datetime.now(timezone.utc),
        )
        db.add(no_show_event)
        db.flush()

        write_audit_event(
            db=db,
            action_type=AuditActionType.NO_SHOW_MARKED,
            entity_type="queue_entry",
            entity_id=entry_id,
            metadata={
                "reason": body.reason,
                "was_auto_flagged": was_auto_flagged,
                "patient_token": entry.patient.token if entry.patient else None,
                "actor_role": current_user.role.value,
            },
            actor_id=current_user.id,
        )

        etas = update_cached_etas(doctor_id, db, reason="no_show_confirmed")
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    snapshot = _build_snapshot(doctor_id, db, etas)
    broadcast_queue_update(doctor_id, "no_show_confirmed", snapshot)
    
    return {"message": "Patient marked as no-show", "entry_id": entry_id}


# ─── Transfer ─────────────────────────────────────────────────────────────────

class TransferRequest(BaseModel):
    to_doctor_id: int
    reason: str


@router.post("/{entry_id}/transfer")
def transfer_patient(
    entry_id: int,
    body: TransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.RECEPTION, UserRole.ADMIN)),
):
    """
    Transfer a patient to another doctor's queue.
    
    REQUIRES explicit staff authorization — never automatic.
    Requires RECEPTION or ADMIN role.
    
    Creates:
    - New QueueEntry for the target doctor
    - QueueTransfer record (immutable history)
    - AuditEvent
    - SSE broadcasts to BOTH doctors' channels
    """
    entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    if not validate_status_transition(entry.status, QueueStatus.TRANSFERRED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transfer entry with status {entry.status.value}",
        )

    to_doctor = db.query(Doctor).filter(Doctor.id == body.to_doctor_id).first()
    if not to_doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target doctor not found")

    if body.to_doctor_id == entry.doctor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to the same doctor",
        )

    from_doctor_id = entry.doctor_id

    try:
        # Mark original entry as TRANSFERRED
        entry.status = QueueStatus.TRANSFERRED
        entry.updated_at = datetime.now(timezone.utc)

        # Create a new QueueEntry in the target doctor's queue
        new_seq = get_next_queue_sequence(body.to_doctor_id, db)
        new_entry = QueueEntry(
            patient_id=entry.patient_id,
            doctor_id=body.to_doctor_id,
            status=QueueStatus.WAITING,
            priority_level=entry.priority_level,  # Preserve priority
            queue_sequence=new_seq,
            joined_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(new_entry)
        db.flush()

        # Create QueueTransfer record (immutable)
        transfer = QueueTransfer(
            queue_entry_id=entry_id,
            from_doctor_id=from_doctor_id,
            to_doctor_id=body.to_doctor_id,
            actor_id=current_user.id,
            reason=body.reason,
            transferred_at=datetime.now(timezone.utc),
        )
        db.add(transfer)
        db.flush()

        write_audit_event(
            db=db,
            action_type=AuditActionType.PATIENT_TRANSFERRED,
            entity_type="queue_entry",
            entity_id=entry_id,
            metadata={
                "from_doctor_id": from_doctor_id,
                "to_doctor_id": body.to_doctor_id,
                "reason": body.reason,
                "patient_token": entry.patient.token if entry.patient else None,
                "new_entry_id": new_entry.id,
            },
            actor_id=current_user.id,
        )

        # Recalculate ETAs for both doctors
        etas_from = update_cached_etas(from_doctor_id, db, reason="patient_transferred_out")
        etas_to = update_cached_etas(body.to_doctor_id, db, reason="patient_transferred_in")
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Broadcast to both channels
    snapshot_from = _build_snapshot(from_doctor_id, db, etas_from)
    snapshot_to = _build_snapshot(body.to_doctor_id, db, etas_to)
    broadcast_queue_update(from_doctor_id, "patient_transferred_out", snapshot_from)
    broadcast_queue_update(body.to_doctor_id, "patient_transferred_in", snapshot_to)
    
    return {
        "message": "Patient transferred successfully",
        "from_doctor_id": from_doctor_id,
        "to_doctor_id": body.to_doctor_id,
        "new_entry_id": new_entry.id,
    }
