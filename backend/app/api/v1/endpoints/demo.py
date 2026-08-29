"""
Demo mode endpoints — only active when DEMO_MODE=true.
These endpoints support the scripted demo incident feature from the spec.
ADMIN role required for all demo endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import require_admin
from app.models import User

router = APIRouter()


def _require_demo_mode():
    """Raise 403 if demo mode is disabled."""
    if not settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo endpoints are only available when DEMO_MODE=true",
        )


@router.get("/status")
def demo_status():
    """Check if demo mode is enabled."""
    return {"demo_mode": settings.DEMO_MODE}


@router.post("/reset")
def reset_demo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
):
    """
    Reset the database to a clean demo state.
    Clears all queue entries and sessions, then re-runs seed data.
    ADMIN only. DEMO_MODE must be enabled.
    """
    _require_demo_mode()
    
    # Import and run seed script
    try:
        from scripts.seed import run_seed
        run_seed(db)
        return {"message": "Demo data reset successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seed failed: {str(e)}",
        )


@router.post("/trigger-emergency")
def trigger_demo_emergency(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
):
    """
    Scripted demo incident: flag the next WAITING patient as EMERGENCY.
    Used during the live demo to reliably show emergency handling.
    ADMIN only. DEMO_MODE must be enabled.
    """
    _require_demo_mode()
    
    from app.core.enums import QueueStatus, PriorityLevel, AuditActionType
    from app.models import QueueEntry, EmergencyEvent
    from app.services.queue_service import get_ordered_queue, update_cached_etas
    from app.services.audit_service import write_audit_event
    from app.services.sse_service import broadcast_queue_update
    from datetime import datetime, timezone
    import math
    
    ordered = get_ordered_queue(doctor_id, db)
    waiting = [e for e in ordered if e.status == QueueStatus.WAITING]
    
    if not waiting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No WAITING patients in this doctor's queue",
        )
    
    target = waiting[0]  # Flag the first waiting patient
    target.priority_level = PriorityLevel.EMERGENCY
    target.updated_at = datetime.now(timezone.utc)
    
    event = EmergencyEvent(
        queue_entry_id=target.id,
        actor_id=current_user.id,
        priority_level=PriorityLevel.EMERGENCY,
        reason="[DEMO] Scripted emergency incident",
        flagged_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.flush()
    
    write_audit_event(
        db=db,
        action_type=AuditActionType.EMERGENCY_FLAGGED,
        entity_type="queue_entry",
        entity_id=target.id,
        metadata={"demo": True, "reason": "[DEMO] Scripted emergency incident"},
        actor_id=current_user.id,
    )
    
    etas = update_cached_etas(doctor_id, db, reason="emergency_flagged")
    db.commit()
    
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
            "position": i + 1,
            "status": entry.status.value,
            "priority": entry.priority_level.value,
            "eta_low_minutes": math.ceil(eta_low / 60) if eta_low else None,
            "eta_high_minutes": math.ceil(eta_high / 60) if eta_high else None,
        })
    broadcast_queue_update(doctor_id, "emergency_flagged", snapshot)
    
    return {
        "message": "Demo emergency triggered",
        "entry_id": target.id,
        "patient_token": target.patient.token if target.patient else None,
    }


@router.post("/trigger-no-show")
def trigger_demo_no_show(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
):
    """
    Scripted demo incident: mark the first WAITING patient as no-show.
    ADMIN only. DEMO_MODE must be enabled.
    """
    _require_demo_mode()
    
    from app.core.enums import QueueStatus, AuditActionType
    from app.models import QueueEntry, NoShowEvent
    from app.services.queue_service import get_ordered_queue, update_cached_etas
    from app.services.audit_service import write_audit_event
    from app.services.sse_service import broadcast_queue_update
    from datetime import datetime, timezone
    import math
    
    ordered = get_ordered_queue(doctor_id, db)
    waiting = [e for e in ordered if e.status == QueueStatus.WAITING]
    
    if not waiting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No WAITING patients in this doctor's queue",
        )
    
    target = waiting[0]
    target.status = QueueStatus.NO_SHOW
    target.updated_at = datetime.now(timezone.utc)
    
    no_show_event = NoShowEvent(
        queue_entry_id=target.id,
        actor_id=current_user.id,
        reason="[DEMO] Scripted no-show incident",
        auto_flagged=False,
        marked_at=datetime.now(timezone.utc),
    )
    db.add(no_show_event)
    db.flush()
    
    write_audit_event(
        db=db,
        action_type=AuditActionType.NO_SHOW_MARKED,
        entity_type="queue_entry",
        entity_id=target.id,
        metadata={"demo": True, "reason": "[DEMO] Scripted no-show incident"},
        actor_id=current_user.id,
    )
    
    etas = update_cached_etas(doctor_id, db, reason="no_show_confirmed")
    db.commit()
    
    entries = get_ordered_queue(doctor_id, db)
    eta_map = {e["queue_entry_id"]: e for e in etas}
    snapshot = [
        {
            "id": entry.id,
            "token": entry.patient.token if entry.patient else "?",
            "position": i + 1,
            "status": entry.status.value,
            "priority": entry.priority_level.value,
        }
        for i, entry in enumerate(entries)
    ]
    broadcast_queue_update(doctor_id, "no_show_confirmed", snapshot)
    
    return {
        "message": "Demo no-show triggered",
        "entry_id": target.id,
        "patient_token": target.patient.token if target.patient else None,
    }
