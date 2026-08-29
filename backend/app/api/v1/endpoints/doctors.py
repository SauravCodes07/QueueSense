"""
Doctors endpoint — availability, workload, recommendations.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, require_reception_or_admin
from app.core.enums import UserRole, AvailabilityStatus, AuditActionType
from app.models import Doctor, User, DoctorAvailabilityLog
from app.services.workload_service import get_workload_summary, get_recommendation, get_all_workloads
from app.services.audit_service import write_audit_event
from datetime import datetime, timezone

router = APIRouter()


@router.get("/")
def list_doctors(
    department_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """List all doctors, optionally filtered by department."""
    query = db.query(Doctor)
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    doctors = query.all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "department_id": d.department_id,
            "availability_status": d.availability_status.value,
        }
        for d in doctors
    ]


@router.get("/workload-recommendations")
def workload_recommendations(
    department_id: int = Query(..., description="Department to find doctors in"),
    exclude_doctor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.RECEPTION, UserRole.ADMIN)),
):
    """
    Return the least-loaded compatible doctor for a new patient.
    READ-ONLY recommendation. Staff must explicitly confirm any transfer.
    Requires RECEPTION or ADMIN role.
    """
    recommendation = get_recommendation(department_id, db, exclude_doctor_id)
    if not recommendation:
        return {"recommendation": None, "reason": "No available doctors in this department"}
    return {"recommendation": recommendation}


@router.get("/{doctor_id}")
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """Get a doctor's profile."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return {
        "id": doctor.id,
        "name": doctor.name,
        "department_id": doctor.department_id,
        "availability_status": doctor.availability_status.value,
        "ema_duration_seconds": doctor.ema_duration_seconds,
    }


@router.get("/{doctor_id}/availability")
def get_doctor_availability(doctor_id: int, db: Session = Depends(get_db)):
    """Get a doctor's current availability status."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return {
        "doctor_id": doctor_id,
        "availability_status": doctor.availability_status.value,
    }


class AvailabilityUpdate(BaseModel):
    status: AvailabilityStatus
    note: Optional[str] = None


@router.post("/{doctor_id}/availability")
def set_doctor_availability(
    doctor_id: int,
    body: AvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a doctor's availability status.
    Doctors can only update their own status.
    RECEPTION and ADMIN can update any doctor.
    Logged to audit trail.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # RBAC: Doctor can only change own status; RECEPTION/ADMIN can change any
    if current_user.role == UserRole.DOCTOR:
        if not current_user.doctor or current_user.doctor.id != doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctors can only update their own availability",
            )

    old_status = doctor.availability_status
    doctor.availability_status = body.status

    # Log to immutable availability log
    log_entry = DoctorAvailabilityLog(
        doctor_id=doctor_id,
        status=body.status,
        changed_by=current_user.id,
        note=body.note,
        changed_at=datetime.now(timezone.utc),
    )
    db.add(log_entry)

    # Audit event
    write_audit_event(
        db=db,
        action_type=AuditActionType.AVAILABILITY_CHANGED,
        entity_type="doctor",
        entity_id=doctor_id,
        metadata={
            "old_status": old_status.value,
            "new_status": body.status.value,
            "note": body.note,
            "actor_role": current_user.role.value,
        },
        actor_id=current_user.id,
    )

    db.commit()

    # Recalculate ETAs and broadcast SSE
    from app.services.queue_service import update_cached_etas
    from app.services.sse_service import broadcast_queue_update
    etas = update_cached_etas(doctor_id, db, reason="availability_changed")
    
    # Build queue snapshot for broadcast
    from app.models import QueueEntry
    from app.core.enums import QueueStatus
    entries = db.query(QueueEntry).filter(
        QueueEntry.doctor_id == doctor_id,
        QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS])
    ).all()
    snapshot = _build_queue_snapshot(entries, etas)
    broadcast_queue_update(doctor_id, "availability_changed", snapshot)

    return {
        "doctor_id": doctor_id,
        "old_status": old_status.value,
        "new_status": body.status.value,
    }


@router.get("/{doctor_id}/workload")
def get_doctor_workload(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get workload metrics for a doctor."""
    summary = get_workload_summary(doctor_id, db)
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return summary


def _build_queue_snapshot(entries, etas: list[dict]) -> list[dict]:
    """Helper to build a queue snapshot for SSE broadcast."""
    from datetime import datetime, timezone, timedelta
    import math
    
    eta_map = {e["queue_entry_id"]: e for e in etas}
    snapshot = []
    
    for i, entry in enumerate(entries):
        eta = eta_map.get(entry.id, {})
        eta_low = eta.get("eta_low_seconds", 0)
        eta_high = eta.get("eta_high_seconds", 0)
        eta_clock = None
        if eta_low is not None:
            eta_clock = (datetime.now(timezone.utc) + timedelta(seconds=eta_low + eta_high) / 2).strftime("%I:%M %p")
        
        snapshot.append({
            "id": entry.id,
            "token": entry.patient.token if entry.patient else "?",
            "position": i + 1,
            "status": entry.status.value,
            "priority": entry.priority_level.value,
            "eta_low_minutes": math.ceil(eta_low / 60) if eta_low else None,
            "eta_high_minutes": math.ceil(eta_high / 60) if eta_high else None,
            "eta_clock": eta_clock,
        })
    
    return snapshot
