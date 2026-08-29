"""API v1 router — aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    departments,
    doctors,
    patients,
    queue,
    consultations,
    stream,
    audit,
    analytics,
    demo,
    ml,
)

router = APIRouter()

# Auth
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Core data
router.include_router(departments.router, prefix="/departments", tags=["Departments"])
router.include_router(doctors.router, prefix="/doctors", tags=["Doctors"])
router.include_router(patients.router, prefix="/patients", tags=["Patients"])

# Queue operations
router.include_router(queue.router, prefix="/queue", tags=["Queue"])

# Consultations
router.include_router(consultations.router, prefix="/consultations", tags=["Consultations"])

# Real-time SSE streams
router.include_router(stream.router, prefix="/stream", tags=["Real-time SSE"])

# Admin operations
router.include_router(audit.router, prefix="/audit-events", tags=["Audit"])
router.include_router(audit.router, prefix="/audit", tags=["Audit"])
router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
router.include_router(ml.router, prefix="/ml", tags=["Machine Learning"])

# Demo mode operations
router.include_router(demo.router, prefix="/demo", tags=["Demo"])
