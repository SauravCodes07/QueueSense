"""
SQLAlchemy database models for QueueSense.
All models use the same Base from core.database.

IMPORTANT: No clinical data stored here. Only operational queue data.
- No diagnosis, no symptoms, no prescriptions, no lab results, no vitals.
- See PS7_MASTER_IMPLEMENTATION_SPEC §21 (Privacy).
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Float,
    ForeignKey, Text, UniqueConstraint, CheckConstraint, Index,
    Enum as SAEnum
)
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON

from app.core.database import Base
from app.core.enums import (
    QueueStatus, PriorityLevel, AvailabilityStatus,
    UserRole, PredictionSource, AppointmentType, AuditActionType
)


def utcnow() -> datetime:
    """Return current UTC time."""
    return datetime.now(timezone.utc)


class Department(Base):
    """Groups doctors by medical specialty."""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    doctors = relationship("Doctor", back_populates="department")

    def __repr__(self) -> str:
        return f"<Department id={self.id} name={self.name!r}>"


class User(Base):
    """
    Staff login identity. NOT used for patients.
    Patients use lightweight token-based identity (see Patient model).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, name="user_role"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # If this user IS a doctor, link to doctor record
    doctor = relationship("Doctor", back_populates="user", uselist=False)

    # Audit trail
    audit_events = relationship("AuditEvent", back_populates="actor", foreign_keys="AuditEvent.actor_id")
    emergency_events = relationship("EmergencyEvent", back_populates="actor", foreign_keys="EmergencyEvent.actor_id")
    no_show_events = relationship("NoShowEvent", back_populates="actor", foreign_keys="NoShowEvent.actor_id")
    queue_transfers = relationship("QueueTransfer", back_populates="actor", foreign_keys="QueueTransfer.actor_id")
    availability_logs = relationship("DoctorAvailabilityLog", back_populates="changed_by_user", foreign_keys="DoctorAvailabilityLog.changed_by")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"


class Doctor(Base):
    """A clinician who runs a queue."""
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, unique=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    name = Column(String(255), nullable=False)
    availability_status = Column(
        SAEnum(AvailabilityStatus, name="availability_status"),
        default=AvailabilityStatus.OFFLINE,
        nullable=False,
    )
    # Cached EMA — updated each time a consultation completes
    ema_duration_seconds = Column(Float, nullable=True)  # None = no history yet (use dept/global default)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="doctor")
    department = relationship("Department", back_populates="doctors")
    queue_entries = relationship("QueueEntry", back_populates="doctor", foreign_keys="QueueEntry.doctor_id")
    consultation_sessions = relationship("ConsultationSession", back_populates="doctor", foreign_keys="ConsultationSession.doctor_id")
    availability_log = relationship("DoctorAvailabilityLog", back_populates="doctor")

    def __repr__(self) -> str:
        return f"<Doctor id={self.id} name={self.name!r} status={self.availability_status}>"


class DoctorAvailabilityLog(Base):
    """
    Immutable log of every availability state change for a doctor.
    Never update or delete rows — only insert.
    """
    __tablename__ = "doctor_availability_log"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False)
    status = Column(SAEnum(AvailabilityStatus, name="availability_status_log"), nullable=False)
    changed_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)  # Nullable for system-initiated
    note = Column(String(500), nullable=True)

    doctor = relationship("Doctor", back_populates="availability_log")
    changed_by_user = relationship("User", back_populates="availability_logs", foreign_keys=[changed_by])

    __table_args__ = (
        Index("ix_doc_avail_log_doctor_id", "doctor_id"),
    )


class Patient(Base):
    """
    A person using the queue system.
    Minimum necessary data only — no clinical information stored.
    """
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(20), nullable=False, unique=True, index=True)  # e.g., "A-42"
    pin_hash = Column(String(255), nullable=True)  # Optional 4-digit PIN for patient auth
    name = Column(String(255), nullable=False)
    contact = Column(String(100), nullable=True)  # Phone number (optional, for notifications)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    appointments = relationship("Appointment", back_populates="patient")
    queue_entries = relationship("QueueEntry", back_populates="patient", foreign_keys="QueueEntry.patient_id")
    notification_events = relationship("NotificationEvent", back_populates="patient")

    def __repr__(self) -> str:
        return f"<Patient id={self.id} token={self.token!r}>"


class Appointment(Base):
    """An intent to be seen — either booked ahead or created as a walk-in."""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False)
    appointment_type = Column(SAEnum(AppointmentType, name="appointment_type"), default=AppointmentType.WALK_IN, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor")
    queue_entry = relationship("QueueEntry", back_populates="appointment", uselist=False)

    __table_args__ = (
        Index("ix_appointments_patient_id", "patient_id"),
        Index("ix_appointments_doctor_id", "doctor_id"),
    )


class QueueEntry(Base):
    """
    Core entity: a patient's live position in a doctor's queue.
    State machine: WAITING → IN_PROGRESS → COMPLETED | NO_SHOW | CANCELLED | TRANSFERRED
    Priority level: ROUTINE (default), URGENT, EMERGENCY
    """
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="RESTRICT"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False)
    status = Column(
        SAEnum(QueueStatus, name="queue_status"),
        default=QueueStatus.WAITING,
        nullable=False,
    )
    priority_level = Column(
        SAEnum(PriorityLevel, name="priority_level"),
        default=PriorityLevel.ROUTINE,
        nullable=False,
    )
    queue_sequence = Column(Integer, nullable=False)  # Monotonically increasing, per doctor
    joined_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Cached ETA from last calculation (for quick read without recalculation)
    cached_eta_low_seconds = Column(Integer, nullable=True)
    cached_eta_high_seconds = Column(Integer, nullable=True)
    cached_eta_reason = Column(String(500), nullable=True)

    # Soft no-show flag (system may flag, staff must confirm)
    no_show_flagged_at = Column(DateTime(timezone=True), nullable=True)

    appointment = relationship("Appointment", back_populates="queue_entry")
    patient = relationship("Patient", back_populates="queue_entries", foreign_keys=[patient_id])
    doctor = relationship("Doctor", back_populates="queue_entries", foreign_keys=[doctor_id])
    consultation_session = relationship("ConsultationSession", back_populates="queue_entry", uselist=False)
    waiting_time_predictions = relationship("WaitingTimePrediction", back_populates="queue_entry")
    emergency_events = relationship("EmergencyEvent", back_populates="queue_entry")
    no_show_events = relationship("NoShowEvent", back_populates="queue_entry")
    queue_transfers = relationship("QueueTransfer", back_populates="queue_entry")

    __table_args__ = (
        # Core performance index: get ordered active queue for a doctor
        Index("ix_queue_entries_doctor_status_seq", "doctor_id", "status", "queue_sequence"),
        # Unique active sequence per doctor (allow duplicates in completed/no-show etc.)
        # Note: cannot use partial unique index in SQLite — handled in application logic
        Index("ix_queue_entries_patient_doctor", "patient_id", "doctor_id"),
    )

    def __repr__(self) -> str:
        return f"<QueueEntry id={self.id} token={self.patient.token if self.patient else '?'} status={self.status} priority={self.priority_level}>"


class ConsultationSession(Base):
    """
    The actual service event — software timestamps only.
    duration_seconds is derived from ended_at - started_at.
    No physical hardware is required; doctor presses Start/Complete buttons.
    """
    __tablename__ = "consultation_sessions"

    id = Column(Integer, primary_key=True, index=True)
    queue_entry_id = Column(Integer, ForeignKey("queue_entries.id", ondelete="RESTRICT"), nullable=False, unique=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)  # Computed at completion
    # Whether this was manually completed by admin (not the treating doctor)
    manually_completed_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)

    queue_entry = relationship("QueueEntry", back_populates="consultation_session")
    doctor = relationship("Doctor", back_populates="consultation_sessions", foreign_keys=[doctor_id])
    waiting_time_predictions = relationship("WaitingTimePrediction", back_populates="consultation_session")

    __table_args__ = (
        # CHECK: ended_at must be >= started_at when set
        # SQLite doesn't enforce check constraints well, but we do it in code too
        CheckConstraint(
            "ended_at IS NULL OR ended_at >= started_at",
            name="ck_consultation_end_after_start"
        ),
        Index("ix_consultation_sessions_doctor_started", "doctor_id", "started_at"),
    )

    def __repr__(self) -> str:
        return f"<ConsultationSession id={self.id} doctor_id={self.doctor_id} duration={self.duration_seconds}s>"


class WaitingTimePrediction(Base):
    """
    Snapshot of an ETA computation — used for audit and model evaluation.
    Allows comparing predicted vs. actual wait times after the fact.
    """
    __tablename__ = "waiting_time_predictions"

    id = Column(Integer, primary_key=True, index=True)
    queue_entry_id = Column(Integer, ForeignKey("queue_entries.id", ondelete="RESTRICT"), nullable=False)
    consultation_session_id = Column(Integer, ForeignKey("consultation_sessions.id", ondelete="RESTRICT"), nullable=True)
    predicted_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    eta_low_seconds = Column(Integer, nullable=False)   # Lower bound of range
    eta_high_seconds = Column(Integer, nullable=False)  # Upper bound of range
    source = Column(SAEnum(PredictionSource, name="prediction_source"), default=PredictionSource.BASELINE, nullable=False)
    reason = Column(String(500), nullable=True)  # What triggered this recalculation

    queue_entry = relationship("QueueEntry", back_populates="waiting_time_predictions")
    consultation_session = relationship("ConsultationSession", back_populates="waiting_time_predictions")

    __table_args__ = (
        Index("ix_wt_predictions_queue_entry_id", "queue_entry_id"),
    )


class EmergencyEvent(Base):
    """
    Immutable record of each emergency flag action.
    Never update or delete rows.
    """
    __tablename__ = "emergency_events"

    id = Column(Integer, primary_key=True, index=True)
    queue_entry_id = Column(Integer, ForeignKey("queue_entries.id", ondelete="RESTRICT"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    priority_level = Column(SAEnum(PriorityLevel, name="emergency_priority"), nullable=False)  # URGENT or EMERGENCY
    reason = Column(String(1000), nullable=False)
    flagged_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    queue_entry = relationship("QueueEntry", back_populates="emergency_events")
    actor = relationship("User", back_populates="emergency_events", foreign_keys=[actor_id])

    __table_args__ = (
        Index("ix_emergency_events_queue_entry_id", "queue_entry_id"),
        Index("ix_emergency_events_actor_flagged", "actor_id", "flagged_at"),
    )


class NoShowEvent(Base):
    """
    Immutable record of each no-show confirmation.
    auto_flagged=True means the system initiated the flag; staff still confirmed.
    Never update or delete rows.
    """
    __tablename__ = "no_show_events"

    id = Column(Integer, primary_key=True, index=True)
    queue_entry_id = Column(Integer, ForeignKey("queue_entries.id", ondelete="RESTRICT"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    reason = Column(String(1000), nullable=True)
    auto_flagged = Column(Boolean, default=False, nullable=False)  # Was this system-initiated?
    marked_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    queue_entry = relationship("QueueEntry", back_populates="no_show_events")
    actor = relationship("User", back_populates="no_show_events", foreign_keys=[actor_id])

    __table_args__ = (
        Index("ix_no_show_events_queue_entry_id", "queue_entry_id"),
    )


class QueueTransfer(Base):
    """
    Immutable record of each patient transfer between doctors.
    Requires explicit staff authorization (never automatic).
    Never update or delete rows.
    """
    __tablename__ = "queue_transfers"

    id = Column(Integer, primary_key=True, index=True)
    queue_entry_id = Column(Integer, ForeignKey("queue_entries.id", ondelete="RESTRICT"), nullable=False)
    from_doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False)
    to_doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    reason = Column(String(1000), nullable=False)
    transferred_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    queue_entry = relationship("QueueEntry", back_populates="queue_transfers")
    actor = relationship("User", back_populates="queue_transfers", foreign_keys=[actor_id])

    __table_args__ = (
        Index("ix_queue_transfers_queue_entry_id", "queue_entry_id"),
    )


class NotificationEvent(Base):
    """In-app notification log — enables NotificationCenter history."""
    __tablename__ = "notification_events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False)
    notification_type = Column(String(100), nullable=False)  # e.g., "ETA_CHANGED", "EMERGENCY_AHEAD"
    payload = Column(JSON, nullable=False, default=dict)
    sent_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    delivered = Column(Boolean, default=True, nullable=False)

    patient = relationship("Patient", back_populates="notification_events")

    __table_args__ = (
        Index("ix_notification_events_patient_id", "patient_id"),
    )


class AuditEvent(Base):
    """
    Immutable audit log for all sensitive actions.
    INSERT-ONLY — never update or delete rows.
    Enforced both at DB level (no update endpoint) and in code.
    """
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)  # Nullable for system actions
    action_type = Column(SAEnum(AuditActionType, name="audit_action_type"), nullable=False)
    entity_type = Column(String(100), nullable=False)  # e.g., "queue_entry", "doctor"
    entity_id = Column(Integer, nullable=False)
    metadata_ = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    actor = relationship("User", back_populates="audit_events", foreign_keys=[actor_id])

    __table_args__ = (
        Index("ix_audit_events_actor_created", "actor_id", "created_at"),
        Index("ix_audit_events_action_type", "action_type"),
        Index("ix_audit_events_entity", "entity_type", "entity_id"),
    )

    def __repr__(self) -> str:
        return f"<AuditEvent id={self.id} action={self.action_type} entity={self.entity_type}:{self.entity_id}>"
