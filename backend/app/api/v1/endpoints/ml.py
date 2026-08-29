"""
ML Model Management Endpoint.
Allows training the ML duration prediction model, viewing metrics, and toggling ML/Baseline mode.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import require_admin
from app.models import User
from app.services.ml_model import train_model, get_ml_status, set_ml_enabled

router = APIRouter()


class MLToggleRequest(BaseModel):
    enabled: bool


@router.get("/status")
def ml_status():
    """Get current ML model status, type, training samples, and MAE."""
    return get_ml_status()


@router.post("/train")
def ml_train(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
):
    """
    Train/retrain the ML model on completed consultation sessions.
    ADMIN only.
    """
    result = train_model(db)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("reason", "Failed to train ML model"),
        )
    return result


@router.post("/toggle")
def ml_toggle(
    body: MLToggleRequest,
    current_user: User = Depends(require_admin()),
):
    """
    Toggle ML prediction on or off live.
    When off, queue ETAs immediately fall back to the EMA baseline.
    ADMIN only.
    """
    set_ml_enabled(body.enabled)
    return {"message": f"ML model enabled set to {body.enabled}", "metrics": get_ml_status()}
