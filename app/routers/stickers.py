from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user_id
from ..database import get_db
from ..models import UserSticker
from ..schemas import CountryProgress, CountryStickers, Progress, StickerOut, ToggleSticker
from ..stickers_data import get_countries, get_country

router = APIRouter(prefix="/api/stickers", tags=["stickers"])


@router.get("/progress", response_model=Progress)
def get_progress(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    countries = get_countries()
    rows = db.query(UserSticker).filter(UserSticker.user_id == user_id).all()
    by_code: dict[str, dict[str, int]] = {}
    for row in rows:
        entry = by_code.setdefault(row.country_code, {"collected": 0, "total": 0})
        entry["total"] += 1
        if row.has_it:
            entry["collected"] += 1

    by_country = []
    for country in countries:
        fallback_total = len(country["stickers"])
        info = by_code.get(country["code"], {"collected": 0, "total": fallback_total})
        by_country.append(
            CountryProgress(
                code=country["code"],
                name=country["name"],
                total=info["total"] or fallback_total,
                collected=info["collected"],
            )
        )

    total = sum(country.total for country in by_country)
    collected = sum(country.collected for country in by_country)

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
    has_it_map = {row.sticker_code: row.has_it for row in rows}

    stickers_out = [
        StickerOut(
            code=sticker["code"],
            label=sticker["label"],
            type=sticker["type"],
            has_it=has_it_map.get(sticker["code"], False),
        )
        for sticker in country["stickers"]
    ]
    collected = sum(1 for sticker in stickers_out if sticker.has_it)

    return CountryStickers(
        code=country["code"],
        name=country["name"],
        flag_emoji=country["flag_emoji"],
        flag_colors=country["flag_colors"],
        group=country.get("group"),
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
    db.commit()
    return {"sticker_code": row.sticker_code, "has_it": row.has_it}
