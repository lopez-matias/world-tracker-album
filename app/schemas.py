from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator
import re


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]{3,20}$", v):
            raise ValueError("Username must be 3-20 chars, letters/numbers/hyphens/underscores only")
        return v

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    login: str
    password: str
    remember_me: bool = False


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class StickerOut(BaseModel):
    code: str
    label: str
    type: str
    has_it: bool


class CountryStickers(BaseModel):
    code: str
    name: str
    flag_emoji: str
    flag_colors: List[str]
    stickers: List[StickerOut]
    collected: int
    total: int


class ToggleSticker(BaseModel):
    sticker_code: str


class CountryProgress(BaseModel):
    code: str
    name: str
    total: int
    collected: int


class Progress(BaseModel):
    total: int
    collected: int
    percentage: float
    by_country: List[CountryProgress]


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UpdateUsername(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]{3,20}$", v):
            raise ValueError("Username must be 3-20 chars, letters/numbers/hyphens/underscores only")
        return v


class UpdatePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str