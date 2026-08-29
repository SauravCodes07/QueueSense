"""
Tests for ML duration prediction, live enable/disable toggle, and graceful fallback to EMA baseline.
"""
from datetime import datetime, timezone, timedelta
from app.models import Doctor, ConsultationSession, QueueEntry, Patient
from app.services.ml_model import train_model, set_ml_enabled, is_ml_available, get_ml_status
from app.services.prediction_service import predict_duration, ema_baseline, get_prediction_source


def test_ml_training_and_fallback(db):
    doctor = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()

    # Create historical sessions for doctor
    now = datetime.now(timezone.utc)
    for i in range(15):
        patient = Patient(token=f"HIST-{i}", name=f"Historical {i}")
        db.add(patient)
        db.flush()
        q_entry = QueueEntry(patient_id=patient.id, doctor_id=doctor.id, queue_sequence=i+1)
        db.add(q_entry)
        db.flush()
        session = ConsultationSession(
            queue_entry_id=q_entry.id,
            doctor_id=doctor.id,
            started_at=now - timedelta(minutes=30 * (15 - i)),
            ended_at=now - timedelta(minutes=30 * (15 - i) - 10),
            duration_seconds=600.0 + (i * 10),  # 600s to 740s
        )
        db.add(session)
    db.commit()

    # Train model
    res = train_model(db)
    # Model should train if sklearn is installed, or gracefully report unavailable
    if res.get("success"):
        assert is_ml_available() is True
        pred = predict_duration(doctor.id, db)
        assert pred > 0.0
        assert get_prediction_source(doctor.id, db) == "ML"

        # Now test disabling ML live -> must fall back to BASELINE without failure
        set_ml_enabled(False)
        assert is_ml_available() is False
        fallback_pred = predict_duration(doctor.id, db)
        assert fallback_pred > 0.0
        assert get_prediction_source(doctor.id, db) == "BASELINE"

        # Re-enable
        set_ml_enabled(True)
        assert is_ml_available() is True
    else:
        # Sklearn not available -> ensure baseline works flawlessly
        pred = predict_duration(doctor.id, db)
        assert pred > 0.0
        assert get_prediction_source(doctor.id, db) == "BASELINE"
