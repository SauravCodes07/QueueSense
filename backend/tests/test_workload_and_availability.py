"""
Tests for Doctor Availability, Workload Balancing, and Queue Transfers.
"""
from fastapi import status
from app.models import Doctor, Department
from app.core.enums import AvailabilityStatus, PriorityLevel, AuditActionType


def test_doctor_availability_change(client, doctor_token, admin_token, db):
    doctor = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()

    d_headers = {"Authorization": f"Bearer {doctor_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    # Dr. Sharma goes on break
    res = client.post(f"/api/v1/doctors/{doctor.id}/availability", json={
        "status": AvailabilityStatus.ON_BREAK.value,
        "note": "Lunch break",
    }, headers=d_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["new_status"] == AvailabilityStatus.ON_BREAK.value

    # Verify audit event recorded
    audit_res = client.get("/api/v1/audit/", headers=a_headers)
    actions = [e["action_type"] for e in audit_res.json()]
    assert AuditActionType.AVAILABILITY_CHANGED.value in actions


def test_workload_recommendation_and_transfer(client, reception_token, db):
    dept = db.query(Department).filter(Department.name == "General Medicine").first()
    doc1 = db.query(Doctor).filter(Doctor.name == "Dr. Sharma").first()
    doc2 = db.query(Doctor).filter(Doctor.name == "Dr. Mehta").first()

    r_headers = {"Authorization": f"Bearer {reception_token}"}

    # Add 3 patients to Dr. Sharma, 0 patients to Dr. Mehta
    p_tokens = []
    entries = []
    for i in range(3):
        p = client.post("/api/v1/patients/", json={"name": f"Patient Load {i}"}).json()["token"]
        p_tokens.append(p)
        j = client.post("/api/v1/queue/join", json={"doctor_id": doc1.id, "patient_token": p}, headers=r_headers).json()
        entries.append(j["entry_id"])

    # Query recommendation for new patient in General Medicine
    rec_res = client.get(f"/api/v1/doctors/workload-recommendations?department_id={dept.id}", headers=r_headers)
    assert rec_res.status_code == status.HTTP_200_OK
    rec = rec_res.json()["recommendation"]
    # Dr. Mehta has 0 load, so Dr. Mehta should be recommended
    assert rec["doctor_id"] == doc2.id

    # Staff authorizes transferring patient 3 from Dr. Sharma to Dr. Mehta
    transfer_res = client.post(f"/api/v1/queue/{entries[2]}/transfer", json={
        "to_doctor_id": doc2.id,
        "reason": "Workload rebalancing due to high queue length",
    }, headers=r_headers)
    assert transfer_res.status_code == status.HTTP_200_OK

    # Verify Dr. Sharma queue now has 2 patients, Dr. Mehta has 1
    q1 = client.get(f"/api/v1/queue/{doc1.id}", headers=r_headers).json()
    q2 = client.get(f"/api/v1/queue/{doc2.id}", headers=r_headers).json()
    assert len(q1) == 2
    assert len(q2) == 1
    assert q2[0]["token"] == p_tokens[2]
