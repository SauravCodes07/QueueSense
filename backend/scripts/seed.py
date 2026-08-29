"""
Seed script — populates the database with realistic demo data.

Creates:
  - 3 departments (General, Cardiology, Pediatrics)
  - 3 doctors (one per department) with User accounts
  - 1 admin user
  - 1 receptionist user
  - 12 patients with varied states
  - Historical consultation sessions (for EMA baseline)
  - Active queue entries in varied states

Designed to be re-run (idempotent). Run before every demo session.
Usage: python -m scripts.seed
"""
import sys
import os

# Add backend root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.core.enums import (
    UserRole, AvailabilityStatus, QueueStatus, PriorityLevel, AppointmentType
)
from app.models import (
    Department, User, Doctor, Patient, Appointment, QueueEntry,
    ConsultationSession
)
import app.models.models  # noqa — ensures all models are registered


def utcnow():
    return datetime.now(timezone.utc)


def run_seed(db: Session):
    """Run the seed data insertion. Clears existing demo data first."""
    print("[SEED] Seeding database...")
    _clear_queue_data(db)
    _seed_departments(db)
    _seed_users_and_doctors(db)
    _seed_historical_sessions(db)
    _seed_patients_and_queue(db)
    print("[SEED] Seed complete")


def _clear_queue_data(db: Session):
    """Clear live queue data (not historical data)."""
    from app.models import (
        AuditEvent, NoShowEvent, EmergencyEvent, QueueTransfer,
        NotificationEvent, WaitingTimePrediction, ConsultationSession,
        QueueEntry, Appointment, Patient
    )
    # Clear in dependency order
    for model in [AuditEvent, NoShowEvent, EmergencyEvent, QueueTransfer,
                  NotificationEvent, WaitingTimePrediction]:
        db.query(model).delete()
    db.query(ConsultationSession).delete()
    db.query(QueueEntry).delete()
    db.query(Appointment).delete()
    db.query(Patient).delete()
    db.flush()
    print("  Cleared existing queue data")


def _seed_departments(db: Session):
    """Create or update departments."""
    depts = [
        {"name": "General Medicine"},
        {"name": "Cardiology"},
        {"name": "Pediatrics"},
    ]
    for dept_data in depts:
        existing = db.query(Department).filter(Department.name == dept_data["name"]).first()
        if not existing:
            db.add(Department(**dept_data))
    db.flush()
    print("  Departments seeded")


def _seed_users_and_doctors(db: Session):
    """Create or update staff users and doctor records."""
    db.flush()
    
    general = db.query(Department).filter(Department.name == "General Medicine").first()
    cardio = db.query(Department).filter(Department.name == "Cardiology").first()
    paeds = db.query(Department).filter(Department.name == "Pediatrics").first()

    # Admin user
    admin = db.query(User).filter(User.email == "admin@queuesense.demo").first()
    if not admin:
        admin = User(
            email="admin@queuesense.demo",
            name="Admin User",
            hashed_password=hash_password("Admin@123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)

    # Receptionist user
    reception = db.query(User).filter(User.email == "reception@queuesense.demo").first()
    if not reception:
        reception = User(
            email="reception@queuesense.demo",
            name="Reception Staff",
            hashed_password=hash_password("Reception@123"),
            role=UserRole.RECEPTION,
            is_active=True,
        )
        db.add(reception)

    # Doctor users
    doctor_data = [
        {"email": "dr.sharma@queuesense.demo", "name": "Dr. Priya Sharma", "password": "Doctor@123", "dept": general, "status": AvailabilityStatus.AVAILABLE},
        {"email": "dr.mehta@queuesense.demo", "name": "Dr. Raj Mehta", "password": "Doctor@123", "dept": cardio, "status": AvailabilityStatus.AVAILABLE},
        {"email": "dr.patel@queuesense.demo", "name": "Dr. Anita Patel", "password": "Doctor@123", "dept": paeds, "status": AvailabilityStatus.AVAILABLE},
    ]

    for dd in doctor_data:
        user = db.query(User).filter(User.email == dd["email"]).first()
        if not user:
            user = User(
                email=dd["email"],
                name=dd["name"],
                hashed_password=hash_password(dd["password"]),
                role=UserRole.DOCTOR,
                is_active=True,
            )
            db.add(user)
            db.flush()
            
            doctor = Doctor(
                user_id=user.id,
                department_id=dd["dept"].id,
                name=dd["name"],
                availability_status=dd["status"],
                ema_duration_seconds=None,
            )
            db.add(doctor)

    db.flush()
    print("  Users and doctors seeded")


def _seed_historical_sessions(db: Session):
    """
    Seed historical consultation sessions so the EMA baseline has real data.
    Creates sessions from the past week.
    """
    doctors = db.query(Doctor).all()
    
    for doctor in doctors:
        # 10 historical sessions per doctor
        base_duration = 720.0  # 12 minutes base
        for i in range(10):
            import random
            # Realistic variance: 6-20 minutes
            duration = max(360.0, base_duration + random.gauss(0, 180))
            started = utcnow() - timedelta(days=random.randint(1, 7), hours=random.randint(0, 8))
            ended = started + timedelta(seconds=duration)
            
            # We need a placeholder queue entry for the session FK
            # Create a dummy patient for historical records
            token = f"H-{doctor.id}-{i}"
            patient = Patient(token=token, name=f"Historical Patient {token}", contact=None)
            db.add(patient)
            db.flush()
            
            appt = Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                appointment_type=AppointmentType.WALK_IN,
                created_at=started,
            )
            db.add(appt)
            db.flush()
            
            entry = QueueEntry(
                appointment_id=appt.id,
                patient_id=patient.id,
                doctor_id=doctor.id,
                status=QueueStatus.COMPLETED,
                priority_level=PriorityLevel.ROUTINE,
                queue_sequence=i + 1,
                joined_at=started - timedelta(minutes=5),
                updated_at=ended,
                cached_eta_low_seconds=None,
                cached_eta_high_seconds=None,
            )
            db.add(entry)
            db.flush()
            
            session = ConsultationSession(
                queue_entry_id=entry.id,
                doctor_id=doctor.id,
                started_at=started,
                ended_at=ended,
                duration_seconds=duration,
            )
            db.add(session)
        
        # Update doctor's EMA from history
        # Simple: use the last 3 sessions average as initial EMA
        doctor.ema_duration_seconds = base_duration + 60  # Slightly over 12 min
    
    db.flush()
    print("  Historical sessions seeded (EMA baseline ready)")


def _seed_patients_and_queue(db: Session):
    """
    Seed active patients in the queue for demo.
    Creates a realistic mid-session state:
    - Doctor 1 (General): IN_PROGRESS + 4 WAITING
    - Doctor 2 (Cardiology): 3 WAITING (no current patient)
    - Doctor 3 (Pediatrics): 2 WAITING
    """
    import random
    
    doctors = db.query(Doctor).all()
    if len(doctors) < 3:
        print("  Warning: expected 3 doctors, found", len(doctors))
        return
    
    # Doctor 1: Dr. Sharma — has current patient + 4 waiting
    doc1 = doctors[0]
    patients_doc1 = [
        {"token": f"A-{i}", "name": f"Patient A-{i}"}
        for i in range(1, 7)
    ]
    
    for idx, pd in enumerate(patients_doc1):
        patient = Patient(token=pd["token"], name=pd["name"], contact=None)
        db.add(patient)
        db.flush()
        
        appt = Appointment(patient_id=patient.id, doctor_id=doc1.id, appointment_type=AppointmentType.WALK_IN, created_at=utcnow() - timedelta(minutes=30 - idx * 5))
        db.add(appt)
        db.flush()
        
        if idx == 0:
            # This patient is IN_PROGRESS (already with doctor)
            entry = QueueEntry(patient_id=patient.id, doctor_id=doc1.id, appointment_id=appt.id,
                               status=QueueStatus.IN_PROGRESS, priority_level=PriorityLevel.ROUTINE,
                               queue_sequence=idx + 1, joined_at=utcnow() - timedelta(minutes=25),
                               updated_at=utcnow())
            db.add(entry)
            db.flush()
            
            session = ConsultationSession(
                queue_entry_id=entry.id, doctor_id=doc1.id,
                started_at=utcnow() - timedelta(minutes=8),  # 8 minutes into consultation
            )
            db.add(session)
        else:
            priority = PriorityLevel.ROUTINE
            if idx == 2:
                priority = PriorityLevel.URGENT  # One urgent patient
            entry = QueueEntry(patient_id=patient.id, doctor_id=doc1.id, appointment_id=appt.id,
                               status=QueueStatus.WAITING, priority_level=priority,
                               queue_sequence=idx + 1, joined_at=utcnow() - timedelta(minutes=20 - idx * 4),
                               updated_at=utcnow())
            db.add(entry)
    
    # Doctor 2: Dr. Mehta — 3 waiting, no current patient
    doc2 = doctors[1]
    for idx in range(3):
        patient = Patient(token=f"B-{idx+1}", name=f"Patient B-{idx+1}", contact=None)
        db.add(patient)
        db.flush()
        appt = Appointment(patient_id=patient.id, doctor_id=doc2.id, appointment_type=AppointmentType.WALK_IN, created_at=utcnow() - timedelta(minutes=15 - idx * 4))
        db.add(appt)
        db.flush()
        entry = QueueEntry(patient_id=patient.id, doctor_id=doc2.id, appointment_id=appt.id,
                           status=QueueStatus.WAITING, priority_level=PriorityLevel.ROUTINE,
                           queue_sequence=idx + 1, joined_at=utcnow() - timedelta(minutes=15 - idx * 4),
                           updated_at=utcnow())
        db.add(entry)
    
    # Doctor 3: Dr. Patel — 2 waiting
    doc3 = doctors[2]
    for idx in range(2):
        patient = Patient(token=f"C-{idx+1}", name=f"Patient C-{idx+1}", contact=None)
        db.add(patient)
        db.flush()
        appt = Appointment(patient_id=patient.id, doctor_id=doc3.id, appointment_type=AppointmentType.WALK_IN, created_at=utcnow() - timedelta(minutes=10 - idx * 3))
        db.add(appt)
        db.flush()
        entry = QueueEntry(patient_id=patient.id, doctor_id=doc3.id, appointment_id=appt.id,
                           status=QueueStatus.WAITING, priority_level=PriorityLevel.ROUTINE,
                           queue_sequence=idx + 1, joined_at=utcnow() - timedelta(minutes=10 - idx * 3),
                           updated_at=utcnow())
        db.add(entry)
    
    db.commit()
    
    # Now calculate initial ETAs
    from app.services.queue_service import update_cached_etas
    for doctor in doctors:
        update_cached_etas(doctor.id, db, reason="initial_seed")
    db.commit()
    
    print("  Active queue seeded with demo patients")
    print()
    print("  Demo credentials:")
    print("    Admin:      admin@queuesense.demo / Admin@123")
    print("    Reception:  reception@queuesense.demo / Reception@123")
    print("    Dr. Sharma: dr.sharma@queuesense.demo / Doctor@123")
    print("    Dr. Mehta:  dr.mehta@queuesense.demo / Doctor@123")
    print("    Dr. Patel:  dr.patel@queuesense.demo / Doctor@123")
    print()
    print("  Active patient tokens: A-1 through A-6, B-1 through B-3, C-1, C-2")


if __name__ == "__main__":
    # Create tables if they don't exist
    import app.models.models  # noqa
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
