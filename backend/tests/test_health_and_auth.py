"""
Tests for Health and Authentication endpoints + RBAC.
"""
from fastapi import status
from app.models import User
from app.core.enums import UserRole


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] in ("ok", "degraded")
    assert data["environment"] == "development"


def test_login_success(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin@123",
    })
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == UserRole.ADMIN.value
    assert data["user"]["email"] == "admin@test.com"


def test_login_invalid_password(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "WrongPassword!",
    })
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_doctor_includes_doctor_id(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "dr.sharma@test.com",
        "password": "Doctor@123",
    })
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["user"]["doctor_id"] is not None


def test_patient_token_auth(client):
    # First create a patient
    create_res = client.post("/api/v1/patients/", json={
        "name": "John Doe",
        "contact": "+1234567890",
    })
    assert create_res.status_code == status.HTTP_201_CREATED
    patient_data = create_res.json()
    token = patient_data["token"]

    # Verify patient token endpoint
    auth_res = client.post(f"/api/v1/auth/patient-token?patient_token={token}")
    assert auth_res.status_code == status.HTTP_200_OK
    assert auth_res.json()["token"] == token


def test_patient_token_invalid(client):
    auth_res = client.post("/api/v1/auth/patient-token?patient_token=INVALID-TOKEN-99")
    assert auth_res.status_code == status.HTTP_401_UNAUTHORIZED
