"""
Tests for Emergency Priority handling, No-Show management, and Audit Logging.
"""
from fastapi import status
from app.models import Doctor, AuditEvent, EmergencyEvent, NoShowEvent
from app.core.enums import PriorityLevel, QueueStatus, AuditActionType


def test_emergency_priority_reorders_queue_and_audits(client, reception_token, admin_token, db):
    doctor = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()

    p1 = client.post("/api/v1/patients/", json={"name": "Routine 1"}).json()["token"]
    p2 = client.post("/api/v1/patients/", json={"name": "Routine 2"}).json()["token"]
    p3 = client.post("/api/v1/patients/", json={"name": "Emergency Patient"}).json()["token"]

    r_headers = {"Authorization": f"Bearer {reception_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    j1 = client.post("/api/v1/queue/join", json={"doctor_id": doctor.id, "patient_token": p1}, headers=r_headers).json()
    j2 = client.post("/api/v1/queue/join", json={"doctor_id": doctor.id, "patient_token": p2}, headers=r_headers).json()
    j3 = client.post("/api/v1/queue/join", json={"doctor_id": doctor.id, "patient_token": p3}, headers=r_headers).json()

    # Prioritize p3 as EMERGENCY
    prio_res = client.post(f"/api/v1/queue/{j3['entry_id']}/priority", json={
        "priority": PriorityLevel.EMERGENCY.value,
        "reason": "Severe chest pain - immediate evaluation needed",
    }, headers=r_headers)
    assert prio_res.status_code == status.HTTP_200_OK

    # Fetch doctor queue and check that Emergency Patient jumped to position 1
    q_res = client.get(f"/api/v1/queue/{doctor.id}", headers=r_headers).json()
    assert q_res[0]["token"] == p3
    assert q_res[0]["priority"] == PriorityLevel.EMERGENCY.value
    assert q_res[0]["position"] == 1
    assert q_res[1]["token"] == p1
    assert q_res[1]["position"] == 2
    assert q_res[2]["token"] == p2
    assert q_res[2]["position"] == 3

    # Verify AuditEvent was logged
    audit_res = client.get("/api/v1/audit/", headers=a_headers)
    assert audit_res.status_code == status.HTTP_200_OK
    actions = [e["action_type"] for e in audit_res.json()]
    assert AuditActionType.EMERGENCY_FLAGGED.value in actions


def test_no_show_workflow(client, reception_token, db):
    doctor = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()

    p1 = client.post("/api/v1/patients/", json={"name": "Patient To NoShow"}).json()["token"]
    p2 = client.post("/api/v1/patients/", json={"name": "Patient Waiting"}).json()["token"]

    r_headers = {"Authorization": f"Bearer {reception_token}"}

    j1 = client.post("/api/v1/queue/join", json={"doctor_id": doctor.id, "patient_token": p1}, headers=r_headers).json()
    j2 = client.post("/api/v1/queue/join", json={"doctor_id": doctor.id, "patient_token": p2}, headers=r_headers).json()

    # Soft flag no-show
    flag_res = client.post(f"/api/v1/queue/{j1['entry_id']}/flag-no-show", headers=r_headers)
    assert flag_res.status_code == status.HTTP_200_OK

    # Confirm no-show
    confirm_res = client.post(f"/api/v1/queue/{j1['entry_id']}/no-show", json={
        "reason": "Called 3 times with no answer"
    }, headers=r_headers)
    assert confirm_res.status_code == status.HTTP_200_OK

    # Verify active queue now only contains patient 2
    q_res = client.get(f"/api/v1/queue/{doctor.id}", headers=r_headers).json()
    assert len(q_res) == 1
    assert q_res[0]["token"] == p2
    assert q_res[0]["position"] == 1
