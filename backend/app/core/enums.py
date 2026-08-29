"""
Enumerations used throughout QueueSense.
All enums map to constrained column values in the database.
"""
import enum


class QueueStatus(str, enum.Enum):
    """
    State machine for a QueueEntry.
    Valid transitions:
      WAITING → IN_PROGRESS → COMPLETED
      WAITING → NO_SHOW
      WAITING → CANCELLED
      WAITING → TRANSFERRED
    Priority level (ROUTINE/URGENT/EMERGENCY) is orthogonal to status.
    """
    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"
    CANCELLED = "CANCELLED"
    TRANSFERRED = "TRANSFERRED"


class PriorityLevel(str, enum.Enum):
    """
    Priority tier for a QueueEntry.
    Higher priority entries are ordered before lower ones (per insertion policy).
    Ordering rule:
      1. IN_PROGRESS (always first)
      2. EMERGENCY (FIFO within tier)
      3. URGENT (FIFO within tier)
      4. ROUTINE (FIFO by queue_sequence)
    """
    ROUTINE = "ROUTINE"
    URGENT = "URGENT"
    EMERGENCY = "EMERGENCY"


class AvailabilityStatus(str, enum.Enum):
    """
    Doctor availability state machine.
    Transitions affect queue ordering and ETA calculations.
    """
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"            # Derived: has an IN_PROGRESS entry
    ON_BREAK = "ON_BREAK"   # Queue frozen — no new IN_PROGRESS
    UNAVAILABLE = "UNAVAILABLE"  # Extended pause
    OFFLINE = "OFFLINE"          # Shift ended; no new joins
    EMERGENCY_ONLY = "EMERGENCY_ONLY"  # Only EMERGENCY/URGENT accepted


class UserRole(str, enum.Enum):
    """
    RBAC roles for staff accounts.
    Patients use lightweight token-based identity (not this role system).
    """
    DOCTOR = "DOCTOR"
    RECEPTION = "RECEPTION"
    ADMIN = "ADMIN"


class PredictionSource(str, enum.Enum):
    """Source of a WaitingTimePrediction — for audit/model evaluation."""
    BASELINE = "BASELINE"  # EMA / weighted moving average
    ML = "ML"              # scikit-learn model


class AppointmentType(str, enum.Enum):
    """How the patient entered the system."""
    WALK_IN = "WALK_IN"
    BOOKED = "BOOKED"


class AuditActionType(str, enum.Enum):
    """All auditable action types."""
    EMERGENCY_FLAGGED = "EMERGENCY_FLAGGED"
    NO_SHOW_MARKED = "NO_SHOW_MARKED"
    PATIENT_TRANSFERRED = "PATIENT_TRANSFERRED"
    AVAILABILITY_CHANGED = "AVAILABILITY_CHANGED"
    CONSULTATION_STARTED = "CONSULTATION_STARTED"
    CONSULTATION_COMPLETED = "CONSULTATION_COMPLETED"
    CONSULTATION_MANUAL_COMPLETE = "CONSULTATION_MANUAL_COMPLETE"
    QUEUE_CANCELLED = "QUEUE_CANCELLED"
    DEMO_RESET = "DEMO_RESET"
