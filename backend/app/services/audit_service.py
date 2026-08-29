"""
Audit Service — immutable event log.

All emergency, no-show, transfer, availability-change, and consultation
events must be recorded here. This is a write-only service.
No update or delete methods exist by design.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.core.enums import AuditActionType
from app.models import AuditEvent

logger = logging.getLogger(__name__)


def write_audit_event(
    db: Session,
    action_type: AuditActionType,
    entity_type: str,
    entity_id: int,
    metadata: dict,
    actor_id: Optional[int] = None,
) -> AuditEvent:
    """
    Write an immutable audit event.
    
    This is the ONLY way to create an AuditEvent.
    There is no update or delete endpoint for AuditEvent.
    
    Args:
        db: Database session (must be within an active transaction)
        action_type: Type of action (from AuditActionType enum)
        entity_type: Name of the entity affected (e.g., "queue_entry", "doctor")
        entity_id: ID of the entity affected
        metadata: Additional context (reason, previous state, new state, etc.)
        actor_id: User who performed the action (None for system actions)
    
    Returns:
        The created AuditEvent (flushed but not committed — let the caller commit)
    """
    event = AuditEvent(
        actor_id=actor_id,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_=metadata,
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.flush()  # Get the ID, but let the caller control commit
    
    logger.info(
        f"AuditEvent: {action_type.value} on {entity_type}:{entity_id}"
        f" by actor:{actor_id} — {metadata}"
    )
    
    return event
