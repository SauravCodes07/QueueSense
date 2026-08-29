"""
Workload Balancing Service.

Computes load_score per doctor and provides:
  1. New-patient assignment recommendation (lowest-load compatible doctor)
  2. Reassignment suggestions when load imbalance exceeds threshold

Load score formula:
  load_score = w1 * waiting_count
              + w2 * sum(predicted_duration for all WAITING patients in seconds) / 60
              + w3 * remaining_time_of_current_consultation / 60
              + w4 * priority_bonus (per EMERGENCY/URGENT entry)

DEFAULT WEIGHTS: w1=1, w2=1/60, w3=1/60, w4=5 (bonus minutes per priority case)

CRITICAL: This service provides RECOMMENDATIONS only.
Transfers always require explicit staff authorization via the transfer endpoint.
No automatic transfers.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.core.enums import QueueStatus, PriorityLevel, AvailabilityStatus
from app.models import Doctor, QueueEntry, ConsultationSession
from app.services.prediction_service import predict_duration

logger = logging.getLogger(__name__)

# Workload score weights
W1_WAITING_COUNT = 1.0
W2_PREDICTED_WAIT = 1 / 60  # Convert seconds to minutes
W3_CURRENT_REMAINING = 1 / 60
W4_PRIORITY_BONUS = 5.0  # Extra "minutes" of load per priority patient


def compute_load_score(doctor_id: int, db: Session) -> float:
    """
    Compute the load score for a single doctor.
    Lower score = less loaded = better candidate for new patient assignment.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        return float("inf")

    # Get all active queue entries
    active_entries = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.doctor_id == doctor_id,
            QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS]),
        )
        .all()
    )

    waiting_entries = [e for e in active_entries if e.status == QueueStatus.WAITING]
    in_progress_entries = [e for e in active_entries if e.status == QueueStatus.IN_PROGRESS]

    # W1: Count of waiting patients
    w1_component = W1_WAITING_COUNT * len(waiting_entries)

    # W2: Sum of predicted durations for all waiting patients (in minutes)
    predicted_total_seconds = sum(predict_duration(doctor_id, db) for _ in waiting_entries)
    w2_component = W2_PREDICTED_WAIT * predicted_total_seconds

    # W3: Remaining time of current consultation (if any)
    w3_component = 0.0
    if in_progress_entries and in_progress_entries[0].consultation_session:
        session = in_progress_entries[0].consultation_session
        if session.started_at:
            started_at = session.started_at
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            elapsed = (now - started_at).total_seconds()
            predicted_total = predict_duration(doctor_id, db)
            remaining = max(0.0, predicted_total - elapsed)
            w3_component = W3_CURRENT_REMAINING * remaining

    # W4: Priority bonus — more urgent patients = more load
    priority_bonus = sum(
        W4_PRIORITY_BONUS
        for e in waiting_entries
        if e.priority_level in (PriorityLevel.EMERGENCY, PriorityLevel.URGENT)
    )

    score = w1_component + w2_component + w3_component + priority_bonus
    
    logger.debug(
        f"Doctor {doctor_id} load_score={score:.2f} "
        f"(w1={w1_component:.1f} w2={w2_component:.1f} "
        f"w3={w3_component:.1f} priority={priority_bonus:.1f})"
    )
    
    return score


def get_workload_summary(doctor_id: int, db: Session) -> dict:
    """
    Return a full workload summary for a doctor.
    Used for the doctor dashboard's WorkloadCard component.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        return {}

    active_entries = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.doctor_id == doctor_id,
            QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS]),
        )
        .all()
    )

    waiting_count = sum(1 for e in active_entries if e.status == QueueStatus.WAITING)
    has_in_progress = any(e.status == QueueStatus.IN_PROGRESS for e in active_entries)
    emergency_count = sum(
        1 for e in active_entries
        if e.status == QueueStatus.WAITING and e.priority_level == PriorityLevel.EMERGENCY
    )
    urgent_count = sum(
        1 for e in active_entries
        if e.status == QueueStatus.WAITING and e.priority_level == PriorityLevel.URGENT
    )

    load_score = compute_load_score(doctor_id, db)

    return {
        "doctor_id": doctor_id,
        "load_score": round(load_score, 2),
        "waiting_count": waiting_count,
        "has_current_patient": has_in_progress,
        "emergency_count": emergency_count,
        "urgent_count": urgent_count,
        "availability_status": doctor.availability_status.value,
    }


def get_recommendation(
    department_id: int,
    db: Session,
    exclude_doctor_id: Optional[int] = None,
) -> Optional[dict]:
    """
    Return the least-loaded compatible doctor for a new patient.
    
    Only considers doctors who are:
    - In the requested department
    - Currently AVAILABLE or on EMERGENCY_ONLY (for routine: only AVAILABLE)
    - Not the excluded doctor (for transfer scenarios)
    
    Returns: {doctor_id, doctor_name, load_score} or None if no candidates.
    
    IMPORTANT: This is a READ-ONLY recommendation.
    No action is taken here. Staff must explicitly approve.
    """
    available_doctors = (
        db.query(Doctor)
        .filter(
            Doctor.department_id == department_id,
            Doctor.availability_status == AvailabilityStatus.AVAILABLE,
        )
        .all()
    )

    if exclude_doctor_id:
        available_doctors = [d for d in available_doctors if d.id != exclude_doctor_id]

    if not available_doctors:
        return None

    # Score all candidates and pick the lowest
    scored = [
        {
            "doctor_id": d.id,
            "doctor_name": d.name,
            "load_score": compute_load_score(d.id, db),
        }
        for d in available_doctors
    ]
    scored.sort(key=lambda x: x["load_score"])

    return scored[0] if scored else None


def get_all_workloads(department_id: Optional[int], db: Session) -> list[dict]:
    """
    Return workload summaries for all relevant doctors.
    Used by the admin Live Board.
    """
    query = db.query(Doctor)
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    
    doctors = query.all()
    return [get_workload_summary(d.id, db) for d in doctors]
