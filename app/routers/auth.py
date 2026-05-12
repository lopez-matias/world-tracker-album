import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..auth import create_access_token, get_current_user_id, hash_password, verify_password
from ..database import get_db
from ..email_service import send_password_reset_email
from ..models import User, UserSticker
from ..schemas import ForgotPassword, ResetPassword, UserCreate, UserLogin, UserOut
from ..stickers_data import get_all_stickers

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


def _set_cookie(response: Response, token: str, remember: bool = False) -> None:
    max_age = 60 * 60 * 24 * 30 if remember else None
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=max_age,
    )


@router.post("/register", response_model=UserOut)
def register(body: UserCreate, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.flush()

    sticker_records = [
        UserSticker(user_id=user.id, country_code=s["country_code"], sticker_code=s["sticker_code"])
        for s in get_all_stickers()
    ]
    db.bulk_save_objects(sticker_records)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    _set_cookie(response, token, remember=False)
    return user


@router.post("/login", response_model=UserOut)
@limiter.limit("10/minute")
def login(request: Request, body: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = (
        db.query(User).filter(User.username == body.login).first()
        or db.query(User).filter(User.email == body.login).first()
    )
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    _set_cookie(response, token, remember=body.remember_me)
    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", samesite="lax")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return {"detail": "If the email exists, a reset link was sent"}

    token = str(uuid.uuid4())
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    send_password_reset_email(user.email, user.username, token)
    return {"detail": "If the email exists, a reset link was sent"}


@router.post("/reset-password")
def reset_password(body: ResetPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == body.token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user.hashed_password = hash_password(body.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"detail": "Password updated successfully"}
