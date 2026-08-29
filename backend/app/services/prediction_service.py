"""
Prediction Service — waiting time estimation.

Architecture (Phase 1 — EMA baseline; Phase 2 adds optional ML):

  predict_duration(doctor_id, db)
      ↓
  try: ml_model.predict(...)  ← optional, may be None or may raise
      ↓ (on failure/unavailable)
  ema_baseline(doctor_id, db) ← always available, always returns a valid number
      ↓ (if no history)
  department_average(doctor, db) or GLOBAL_DEFAULT

CRITICAL RULE: predict_duration() NEVER raises. It always returns a float.
The ML path is wrapped in a try/except. This is what makes the system safe.

Per PS7_MASTER_IMPLEMENTATION_SPEC §11:
  "Wrap the model call in a try/except; on any exception or None result,
   fall through to the EMA baseline. Never raise to the caller."
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.models import Doctor, ConsultationSession, QueueEntry, Department

logger = logging.getLogger(__name__)

# ─── Global default when no history is available at all ───────────────────────
GLOBAL_DEFAULT_SECONDS = settings.DEFAULT_CONSULTATION_DURATION_SECONDS  # 720s = 12 min
EMA_ALPHA = settings.EMA_ALPHA   # 0.3
EMA_WINDOW = settings.EMA_WINDOW_SIZE  # 10


def ema_baseline(doctor_id: int, db: Session) -> float:
    """
    Compute the EMA (Exponential Moving Average) baseline for a doctor.
    
    Uses the last EMA_WINDOW completed consultations for the doctor.
    Falls back to department average, then global default.
    
    Returns: duration in seconds (always a positive float)
    """
    # Get last N completed consultation durations for this doctor
    recent_sessions = (
        db.query(ConsultationSession.duration_seconds)
        .filter(
            ConsultationSession.doctor_id == doctor_id,
            ConsultationSession.duration_seconds.is_not(None),
            ConsultationSession.duration_seconds > 0,
        )
        .order_by(ConsultationSession.ended_at.desc())
        .limit(EMA_WINDOW)
        .all()
    )

    if recent_sessions:
        # Compute EMA over the most recent sessions (newest first → apply in reverse)
        durations = [s.duration_seconds for s in recent_sessions]
        durations.reverse()  # Oldest first for correct EMA accumulation
        
        ema = durations[0]  # Start with oldest
        for d in durations[1:]:
            ema = EMA_ALPHA * d + (1 - EMA_ALPHA) * ema
        
        logger.debug(f"Doctor {doctor_id} EMA baseline: {ema:.1f}s from {len(durations)} sessions")
        return max(60.0, ema)  # Sanity floor: at least 1 minute

    # No doctor history — try department average
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if doctor and doctor.department_id:
        dept_avg = _department_average(doctor.department_id, db)
        if dept_avg:
            logger.debug(f"Doctor {doctor_id} using department avg: {dept_avg:.1f}s")
            return dept_avg

    # Final fallback: global default
    logger.debug(f"Doctor {doctor_id} using global default: {GLOBAL_DEFAULT_SECONDS}s")
    return float(GLOBAL_DEFAULT_SECONDS)


def _department_average(department_id: int, db: Session) -> Optional[float]:
    """
    Compute average consultation duration for a department.
    Returns None if no history.
    """
    result = (
        db.query(func.avg(ConsultationSession.duration_seconds))
        .join(Doctor, ConsultationSession.doctor_id == Doctor.id)
        .filter(
            Doctor.department_id == department_id,
            ConsultationSession.duration_seconds.is_not(None),
            ConsultationSession.duration_seconds > 0,
        )
        .scalar()
    )
    return float(result) if result else None


def predict_duration(doctor_id: int, db: Session, context: Optional[dict] = None) -> float:
    """
    Predict the next consultation duration for a doctor (in seconds).
    
    ALWAYS returns a valid positive float. Never raises to the caller.
    Falls back to EMA baseline if ML is unavailable or fails.
    
    Phase 1: EMA baseline only.
    Phase 2: ML model wrapped with fallback.
    """
    # Phase 2: Try ML model first (optional)
    try:
        ml_result = _try_ml_prediction(doctor_id, db, context)
        if ml_result is not None and _is_sane_prediction(ml_result):
            logger.debug(f"Doctor {doctor_id} using ML prediction: {ml_result:.1f}s")
            return ml_result
    except Exception as e:
        logger.warning(f"ML prediction failed for doctor {doctor_id}, using EMA baseline. Error: {e}")

    # Phase 1 / Fallback: EMA baseline
    return ema_baseline(doctor_id, db)


def _try_ml_prediction(doctor_id: int, db: Session, context: Optional[dict]) -> Optional[float]:
    """
    Attempt to get an ML prediction.
    Returns None if ML is not available/enabled.
    May raise — caller handles exception.
    """
    try:
        from app.services.ml_model import is_ml_available, ml_predict
        if not is_ml_available():
            return None
        return ml_predict(doctor_id, db, context or {})
    except ImportError:
        # ml_model module not yet built (Phase 12) — this is expected in Phase 1
        return None


def _is_sane_prediction(value: float) -> bool:
    """
    Sanity check on a prediction.
    Must be > 0 and < 3 hours (10800s) to be considered sane.
    """
    return 60.0 <= value <= 10800.0


def get_prediction_source(doctor_id: int, db: Session) -> str:
    """
    Return the string label of the active prediction source.
    Used for the 'PredictionConfidence' chip on the doctor dashboard.
    """
    try:
        from app.services.ml_model import is_ml_available
        if is_ml_available():
            return "ML"
    except ImportError:
        pass
    return "BASELINE"
