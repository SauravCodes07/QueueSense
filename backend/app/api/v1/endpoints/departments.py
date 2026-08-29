"""Departments endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Department

router = APIRouter()


@router.get("/")
def list_departments(db: Session = Depends(get_db)):
    """List all departments."""
    departments = db.query(Department).all()
    return [{"id": d.id, "name": d.name} for d in departments]


@router.get("/{department_id}")
def get_department(department_id: int, db: Session = Depends(get_db)):
    """Get a department by ID."""
    from fastapi import HTTPException, status
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return {"id": dept.id, "name": dept.name}
