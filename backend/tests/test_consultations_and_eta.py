"""
Tests for Consultation tracking, timing, and dynamic ETA recalculation.
"""
from fastapi import status
from app.models import Doctor, QueueEntry
from app.core.enums import QueueStatus


def test_consultation_lifecycle_and_eta_update(client, doctor_token, reception_token, db):
    doctor = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()

    # Create 2 patients and join queue
    p1 = client.post("/api/v1/patients/", json={"name": "Patient 1"}).json()["token"]
    p2 = client.post("/api/v1/patients/", json={"name": "Patient 2"}).json()["token"]

    r_headers = {"Authorization": f"Bearer {reception_token}"}
    d_headers = {"Authorization": f"Bearer {doctor_token}"}

    j1 = client.post("/api/v1/queue/join", json={"doctor_id": doctor.id, "patient_token": p1}, headers=r_headers).json()
    j2 = client.post("/api/v1/queue/join", json={"doctor_id": doctor.id, "patient_token": p2}, headers=r_headers).json()

    # Doctor starts consultation with patient 1
    start_res = client.post("/api/v1/consultations/start", json={"queue_entry_id": j1["entry_id"]}, headers=d_headers)
    assert start_res.status_code == status.HTTP_200_OK

    # Verify patient 1 is IN_PROGRESS
    q_res = client.get(f"/api/v1/queue/{doctor.id}", headers=d_headers).json()
    assert q_res[0]["status"] == QueueStatus.IN_PROGRESS.value
    assert q_res[1]["status"] == QueueStatus.WAITING.value

    # Verify double start is prevented
    dup_start = client.post("/api/v1/consultations/start", json={"queue_entry_id": j2["entry_id"]}, headers=d_headers)
    assert dup_start.status_code == status.HTTP_409_CONFLICT

    # Complete consultation for patient 1
    complete_res = client.post("/api/v1/consultations/complete", json={"queue_entry_id": j1["entry_id"]}, headers=d_headers)
    assert complete_res.status_code == status.HTTP_200_OK
    data = complete_res.json()
    assert "duration_seconds" in data
    assert data["doctor_ema_seconds"] is not None

    # Verify patient 2 is now first in queue
    q_res2 = client.get(f"/api/v1/queue/{doctor.id}", headers=d_headers).json()
    assert len(q_res2) == 1
    assert q_res2[0]["token"] == p2
    assert q_res2[0]["position"] == 1


def test_doctor_cannot_modify_other_doctor_consultation(client, doctor_2_token, reception_token, db):
    doctor1 = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()
    p1 = client.post("/api/v1/patients/", json={"name": "Patient 1"}).json()["token"]

    r_headers = {"Authorization": f"Bearer {reception_token}"}
    d2_headers = {"Authorization": f"Bearer {doctor_2_token}"}

    j1 = client.post("/api/v1/queue/join", json={"doctor_id": doctor1.id, "patient_token": p1}, headers=r_headers).json()

    # Dr. Mehta attempts to start consultation for Dr. Sharma's patient -> 403 Forbidden
    res = client.post("/api/v1/consultations/start", json={"queue_entry_id": j1["entry_id"]}, headers=d2_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN
