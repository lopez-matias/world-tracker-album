# World Cup 2026 — Panini Sticker Album Tracker

A mobile-first web app to track your FIFA World Cup 2026 Panini sticker collection. Navigate through all 50 sections — the FIFA intro, 48 national teams across 12 groups, and the Coca-Cola closing section — and mark each sticker as you collect it.

![Tech Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![Database](https://img.shields.io/badge/Database-SQLite%20%2F%20PostgreSQL-336791?style=flat-square&logo=postgresql)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)

---

## Features

- **Full Panini album** — 50 sections, 1,000+ stickers in real album order
- **Per-country dynamic backgrounds** — each page adapts its color palette to the national flag
- **Sticker search** — find any country or sticker code instantly
- **Global & per-country progress tracking** — visual progress bars updated in real time
- **User accounts** — register, log in, and keep your collection synced across devices
- **Mobile-first design** — swipe between countries, large touch targets, responsive on any screen
- **No dependencies on external icon libraries** — pure SVG icons throughout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | [FastAPI](https://fastapi.tiangolo.com/) + Python 3.11 |
| ORM | [SQLAlchemy](https://www.sqlalchemy.org/) |
| Auth | JWT via HTTP-only cookies (bcrypt password hashing) |
| Database | SQLite (development) / PostgreSQL via [Neon](https://neon.tech) (production) |
| Frontend | Vanilla JS, CSS custom properties, no frameworks |
| Deployment | [Vercel](https://vercel.com) (serverless Python) |

---

## Local Development

### Prerequisites

- Python 3.11+
- Git

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/world-tracker-album.git
cd world-tracker-album

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Open .env and fill in the values (see Environment Variables below)

# 5. Start the development server
uvicorn app.main:app --reload
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

The SQLite database (`mundial2026.db`) is created automatically on first run.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | JWT signing secret — generate with `openssl rand -hex 32` | `a1b2c3...` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./mundial2026.db` |
| `APP_URL` | Your app's public URL (used for CORS) | `http://localhost:8000` |

For PostgreSQL (Neon or any provider):

```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/mundial2026?sslmode=require
```

---

## Deploying to Vercel

This project is configured for zero-config deployment on Vercel using `@vercel/python`.

1. Push your repository to GitHub.
2. Import the project on [vercel.com](https://vercel.com).
3. Add the environment variables in the Vercel dashboard under **Settings → Environment Variables**:
   - `SECRET_KEY`
   - `DATABASE_URL` (must be a PostgreSQL URL — SQLite is not supported on Vercel's read-only filesystem)
   - `APP_URL` (your `*.vercel.app` URL)
4. Deploy. Every push to `main` triggers an automatic redeploy.

> **Note:** For the database, use [Neon](https://neon.tech) — it offers a free PostgreSQL tier that pairs perfectly with Vercel.

---

## Project Structure

```
world-tracker-album/
├── api/
│   └── index.py              # Vercel serverless entry point
├── app/
│   ├── main.py               # FastAPI app, static file mounts, CORS
│   ├── config.py             # Settings loaded from .env
│   ├── database.py           # SQLAlchemy engine & session
│   ├── models.py             # User, UserSticker ORM models
│   ├── schemas.py            # Pydantic request / response schemas
│   ├── auth.py               # JWT creation & verification, bcrypt
│   ├── stickers_data.py      # Loads and caches stickers.json
│   └── routers/
│       ├── auth.py           # POST /api/auth/{register,login,logout,me}
│       ├── stickers.py       # GET /api/stickers/{progress,country}, POST /toggle
│       └── users.py          # PATCH /api/users/{profile,password}
├── data/
│   └── stickers.json         # 50 sections — FIFA intro, 48 teams, Coca-Cola
├── frontend/
│   ├── index.html            # Login & registration page
│   ├── album.html            # Main album view
│   ├── profile.html          # User profile & settings
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── auth.js
│       ├── album.js
│       └── profile.js
├── .env.example
├── requirements.txt
└── vercel.json
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Log in (sets HTTP-only cookie) |
| `POST` | `/api/auth/logout` | Clear auth cookie |
| `GET` | `/api/auth/me` | Current authenticated user |
| `GET` | `/api/stickers/progress` | Global collection progress |
| `GET` | `/api/stickers/{code}` | Stickers for a specific country |
| `POST` | `/api/stickers/toggle` | Mark / unmark a sticker as collected |
| `PATCH` | `/api/users/profile` | Update username |
| `PATCH` | `/api/users/password` | Change password |

---

## Sticker Data Format

Each entry in `data/stickers.json` follows this structure:

```json
{
  "code": "ARG",
  "name": "Argentina",
  "flag_emoji": "🇦🇷",
  "flag_colors": ["#74ACDF", "#FFFFFF", "#F6B40E"],
  "group": "J",
  "stickers": [
    { "code": "ARG01", "label": "Escudo",         "type": "badge"   },
    { "code": "ARG02", "label": "",               "type": "player"  },
    { "code": "ARG13", "label": "Foto del equipo","type": "group"   }
  ]
}
```

| Field | Description |
|---|---|
| `code` | Unique 3-letter country code |
| `flag_colors` | Array of hex colors used for dynamic background |
| `group` | World Cup group (A–L) |
| `stickers[].type` | `badge`, `player`, `group`, or `special` |

---

## Security Notes

- Never commit your `.env` file. It is listed in `.gitignore`.
- If you accidentally expose a `SECRET_KEY` or any API key, rotate it immediately.
- Generate a strong secret with: `openssl rand -hex 32`

---

## License

MIT
