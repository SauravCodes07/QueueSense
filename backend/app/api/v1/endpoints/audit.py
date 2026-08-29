"""Audit log endpoint — read-only, admin only."""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import require_admin
from app.models import User, AuditEvent

router = APIRouter()


@router.get("/")
def list_audit_events(
    actor_id: Optional[int] = Query(None),
    action_type: Optional[str] = Query(None),
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
):
    """
    Retrieve audit events. ADMIN only.
    Filterable by actor, action type, and date range.
    Read-only — no update or delete.
    """
    query = db.query(AuditEvent)
    if actor_id:
        query = query.filter(AuditEvent.actor_id == actor_id)
    if action_type:
        query = query.filter(AuditEvent.action_type == action_type)
    if from_dt:
        query = query.filter(AuditEvent.created_at >= from_dt)
    if to_dt:
        query = query.filter(AuditEvent.created_at <= to_dt)
    
    events = query.order_by(AuditEvent.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": e.id,
            "actor_id": e.actor_id,
            "actor_name": e.actor.name if e.actor else "System",
            "action_type": e.action_type.value,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "metadata": e.metadata_,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]
