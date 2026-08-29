"""
Pytest configuration and fixtures for QueueSense.
Uses an in-memory SQLite database with StaticPool isolated per test session/function.
"""
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.core.enums import UserRole, AvailabilityStatus, PriorityLevel, QueueStatus
from app.models import Department, User, Doctor, Patient, Appointment, QueueEntry, ConsultationSession
from app.main import app

# In-memory SQLite with StaticPool so all connections share the same memory DB
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh in-memory database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    try:
        # Seed basic required entities
        dept_general = Department(name="General Medicine")
        dept_cardio = Department(name="Cardiology")
        session.add_all([dept_general, dept_cardio])
        session.flush()

        # Admin user
        admin_user = User(
            email="admin@test.com",
            name="Admin Test",
            hashed_password=hash_password("Admin@123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        # Reception user
        reception_user = User(
            email="reception@test.com",
            name="Reception Test",
            hashed_password=hash_password("Reception@123"),
            role=UserRole.RECEPTION,
            is_active=True,
        )
        # Doctor user 1
        doc_user_1 = User(
            email="dr.sharma@test.com",
            name="Dr. Sharma",
            hashed_password=hash_password("Doctor@123"),
            role=UserRole.DOCTOR,
            is_active=True,
        )
        # Doctor user 2
        doc_user_2 = User(
            email="dr.mehta@test.com",
            name="Dr. Mehta",
            hashed_password=hash_password("Doctor@123"),
            role=UserRole.DOCTOR,
            is_active=True,
        )
        session.add_all([admin_user, reception_user, doc_user_1, doc_user_2])
        session.flush()

        # Doctor profiles
        doctor_1 = Doctor(
            user_id=doc_user_1.id,
            department_id=dept_general.id,
            name="Dr. Sharma",
            availability_status=AvailabilityStatus.AVAILABLE,
            ema_duration_seconds=600.0,
        )
        doctor_2 = Doctor(
            user_id=doc_user_2.id,
            department_id=dept_general.id,
            name="Dr. Mehta",
            availability_status=AvailabilityStatus.AVAILABLE,
            ema_duration_seconds=720.0,
        )
        session.add_all([doctor_1, doctor_2])
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """TestClient that uses the test DB session override."""
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(db):
    user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    return create_access_token({"sub": str(user.id), "role": user.role.value, "name": user.name})


@pytest.fixture
def reception_token(db):
    user = db.query(User).filter(User.role == UserRole.RECEPTION).first()
    return create_access_token({"sub": str(user.id), "role": user.role.value, "name": user.name})


@pytest.fixture
def doctor_token(db):
    user = db.query(User).filter(User.email == "dr.sharma@test.com").first()
    return create_access_token({"sub": str(user.id), "role": user.role.value, "name": user.name})


@pytest.fixture
def doctor_2_token(db):
    user = db.query(User).filter(User.email == "dr.mehta@test.com").first()
    return create_access_token({"sub": str(user.id), "role": user.role.value, "name": user.name})
