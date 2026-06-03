# deps.py — reusable FastAPI "dependencies".
#
# A FastAPI dependency is a function that runs before your route handler and
# injects something useful (a DB session, the current user, etc.).
# Centralising them here keeps routers clean.

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models


def get_current_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> models.user.User:
    """
    Placeholder auth dependency.

    In a real app this would decode a JWT token from the Authorization header
    and look up the matching user. For now it just accepts a user_id query
    param so you can test protected endpoints without a real auth flow.
    """
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user
