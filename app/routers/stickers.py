from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import UserSticker
from ..schemas import CountryStickers, Progress, StickerOut, ToggleSticker, CountryProgress
from ..auth import get_current_user_id
from ..stickers_data import get_countries, get_country

router = APIRouter(prefix="/api/stickers", tags=["stickers"])


@router.get("/progress", response_model=Progress)
def get_progress(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    countries = get_countries()
    rows = db.query(UserSticker).filter(UserSticker.user_id == user_id).all()
    by_code: dict[str, dict] = {}
    for r in rows:
        entry = by_code.setdefault(r.country_code, {"collected": 0, "total": 0})
        entry["total"] += 1
        if r.has_it:
            entry["collected"] += 1

    total = sum(v["total"] for v in by_code.values())
    collected = sum(v["collected"] for v in by_code.values())

    by_country = []
    for country in countries:
        info = by_code.get(country["code"], {"collected": 0, "total": 20})
        by_country.append(CountryProgress(
            code=country["code"],
            name=country["name"],
            total=info["total"],
            collected=info["collected"],
        ))

    return Progress(
        total=total,
        collected=collected,
        percentage=round(collected / total * 100, 1) if total else 0,
        by_country=by_country,
    )


@router.get("/{country_code}", response_model=CountryStickers)
def get_country_stickers(
    country_code: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    country = get_country(country_code.upper())
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    rows = (
        db.query(UserSticker)
        .filter(UserSticker.user_id == user_id, UserSticker.country_code == country_code.upper())
        .all()
    )
    has_it_map = {r.sticker_code: r.has_it for r in rows}

    stickers_out = [
        StickerOut(
            code=s["code"],
            label=s["label"],
            type=s["type"],
            has_it=has_it_map.get(s["code"], False),
        )
        for s in country["stickers"]
    ]
    collected = sum(1 for s in stickers_out if s.has_it)

    return CountryStickers(
        code=country["code"],
        name=country["name"],
        flag_emoji=country["flag_emoji"],
        flag_colors=country["flag_colors"],
        stickers=stickers_out,
        collected=collected,
        total=len(stickers_out),
    )


@router.post("/toggle")
def toggle_sticker(
    body: ToggleSticker,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    row = (
        db.query(UserSticker)
        .filter(UserSticker.user_id == user_id, UserSticker.sticker_code == body.sticker_code)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Sticker not found")

    row.has_it = not row.has_it
    row.updated_at = datetime.utcnow()