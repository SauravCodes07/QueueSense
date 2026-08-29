"""Analytics endpoint — aggregate wait-time and queue statistics."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.auth import require_roles
from app.core.enums import UserRole, QueueStatus
from app.models import User, ConsultationSession, QueueEntry, Doctor

router = APIRouter()


@router.get("/wait-times")
def wait_time_analytics(
    department_id: Optional[int] = Query(None),
    range_days: int = Query(7, alias="range", le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.RECEPTION, UserRole.ADMIN)),
):
    """
    Aggregate wait-time analytics.
    Returns: average wait by doctor, no-show rate, department summary.
    """
    from datetime import datetime, timezone, timedelta
    since = datetime.now(timezone.utc) - timedelta(days=range_days)
    
    # Average consultation duration per doctor
    doctor_stats = []
    query = db.query(Doctor)
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    
    doctors = query.all()
    for doctor in doctors:
        avg_duration = (
            db.query(func.avg(ConsultationSession.duration_seconds))
            .filter(
                ConsultationSession.doctor_id == doctor.id,
                ConsultationSession.ended_at >= since,
                ConsultationSession.duration_seconds.is_not(None),
            )
            .scalar()
        )
        total_completed = (
            db.query(func.count(QueueEntry.id))
            .filter(
                QueueEntry.doctor_id == doctor.id,
                QueueEntry.status == QueueStatus.COMPLETED,
                QueueEntry.joined_at >= since,
            )
            .scalar() or 0
        )
        no_show_count = (
            db.query(func.count(QueueEntry.id))
            .filter(
                QueueEntry.doctor_id == doctor.id,
                QueueEntry.status == QueueStatus.NO_SHOW,
                QueueEntry.joined_at >= since,
            )
            .scalar() or 0
        )
        total = total_completed + no_show_count
        
        doctor_stats.append({
            "doctor_id": doctor.id,
            "doctor_name": doctor.name,
            "department_id": doctor.department_id,
            "avg_consultation_duration_seconds": round(float(avg_duration), 1) if avg_duration else None,
            "avg_consultation_duration_minutes": round(float(avg_duration) / 60, 1) if avg_duration else None,
            "total_completed": total_completed,
            "no_show_count": no_show_count,
            "no_show_rate": round(no_show_count / total * 100, 1) if total > 0 else 0.0,
            "ema_duration_seconds": doctor.ema_duration_seconds,
        })
    
    return {
        "range_days": range_days,
        "department_id": department_id,
        "doctors": doctor_stats,
    }
