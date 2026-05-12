from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UpdatePassword, UpdateUsername, UserOut
from ..auth import get_current_user_id, hash_password, verify_password

router = APIRouter(prefix="/api/users", tags=["users"])


@router.patch("/profile", response_model=UserOut)
def update_profile(
    body: UpdateUsername,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.username == body.username, User.id != user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    user = db.query(User).filter(User.id == user_id).first()
    user.username = body.username
    db.commit()
    db.refresh(user)
    return user


@router.patch("/password")
def update_password(
    body: UpdatePassword,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}