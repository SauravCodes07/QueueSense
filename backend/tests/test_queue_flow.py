"""
Tests for Core Queue Engine — deterministic ordering, joining, and cancellation.
"""
from fastapi import status
from app.models import Doctor, Patient
from app.core.enums import PriorityLevel, QueueStatus


def test_join_queue_and_ordering(client, reception_token, db):
    doctor = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()

    # Create 3 patients
    tokens = []
    for name in ["Patient A", "Patient B", "Patient C"]:
        p_res = client.post("/api/v1/patients/", json={"name": name})
        tokens.append(p_res.json()["token"])

    headers = {"Authorization": f"Bearer {reception_token}"}

    # Join patients sequentially
    for token in tokens:
        join_res = client.post("/api/v1/queue/join", json={
            "doctor_id": doctor.id,
            "patient_token": token,
            "priority": PriorityLevel.ROUTINE.value,
        }, headers=headers)
        assert join_res.status_code == status.HTTP_201_CREATED

    # Fetch doctor queue
    queue_res = client.get(f"/api/v1/queue/{doctor.id}", headers=headers)
    assert queue_res.status_code == status.HTTP_200_OK
    queue_data = queue_res.json()

    assert len(queue_data) == 3
    assert queue_data[0]["token"] == tokens[0]
    assert queue_data[0]["position"] == 1
    assert queue_data[1]["token"] == tokens[1]
    assert queue_data[1]["position"] == 2
    assert queue_data[2]["token"] == tokens[2]
    assert queue_data[2]["position"] == 3


def test_prevent_double_join(client, reception_token, db):
    doctor = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()
    p_res = client.post("/api/v1/patients/", json={"name": "Patient Duplicate"})
    token = p_res.json()["token"]

    headers = {"Authorization": f"Bearer {reception_token}"}

    # First join succeeds
    res1 = client.post("/api/v1/queue/join", json={
        "doctor_id": doctor.id,
        "patient_token": token,
    }, headers=headers)
    assert res1.status_code == status.HTTP_201_CREATED

    # Second join fails with conflict (409)
    res2 = client.post("/api/v1/queue/join", json={
        "doctor_id": doctor.id,
        "patient_token": token,
    }, headers=headers)
    assert res2.status_code == status.HTTP_409_CONFLICT


def test_cancel_queue_entry(client, reception_token, db):
    doctor = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()
    p_res = client.post("/api/v1/patients/", json={"name": "Patient Cancel"})
    token = p_res.json()["token"]

    headers = {"Authorization": f"Bearer {reception_token}"}

    join_res = client.post("/api/v1/queue/join", json={
        "doctor_id": doctor.id,
        "patient_token": token,
    }, headers=headers)
    entry_id = join_res.json()["entry_id"]

    # Cancel
    cancel_res = client.post(f"/api/v1/queue/{entry_id}/cancel", json={
        "reason": "Patient requested cancellation"
    }, headers=headers)
    assert cancel_res.status_code == status.HTTP_200_OK

    # Verify queue is now empty
    q_res = client.get(f"/api/v1/queue/{doctor.id}", headers=headers)
    assert len(q_res.json()) == 0
