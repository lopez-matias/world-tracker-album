import json
import os
from typing import List, Dict

_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "stickers.json")
_countries: List[Dict] = []


def _load():
    global _countries
    if not _countries:
        with open(_DATA_PATH, encoding="utf-8") as f:
            _countries = json.load(f)


def get_countries() -> List[Dict]:
    _load()
    return _countries


def get_country(code: str) -> Dict | None:
    _load()
    return next((c for c in _countries if c["code"] == code), None)


def get_all_stickers() -> List[Dict]:
    _load()
    result = []
    for country in _countries:
        for sticker in country["stickers"]:
            result.append({"country_code": country["code"], "sticker_code": sticker["code"]})
    return result