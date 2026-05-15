# FIFA World Cup 2026 — Panini Sticker Album Tracker

> Track your FIFA World Cup 2026 Panini sticker collection online, sync it across devices, and never lose track of what you have or what you need.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-albumpanini2026.vercel.app-4f46e5?style=for-the-badge&logo=vercel)](https://albumpanini2026.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)

---

## Try It Now

**[https://albumpanini2026.vercel.app](https://albumpanini2026.vercel.app)**

Create a free account, browse all 50 sections of the album, and start marking stickers as you collect them. Your progress syncs automatically across all your devices.

---

## Screenshots

### Desktop

| Login | Album |
|---|---|
| ![Login page](images/desktop-login.png) | ![Album view](images/desktop-album.png) |

### Mobile

| Album | Profile |
|---|---|
| ![Mobile album](images/mobile-album.png) | ![Mobile profile](images/mobile-profile.png) |

---

## What Is This?

This is a full-stack web app that digitizes the official FIFA World Cup 2026 Panini sticker album. Instead of paper checklists or spreadsheets, you get an interactive album that mirrors the real one — 50 sections, 1,000+ stickers — where you tap or click each sticker to mark it as collected.

Each national team page automatically adapts its color palette to that country's flag, and a global progress bar shows how close you are to completing the full album.

---

## Features

| Feature | Details |
|---|---|
| **Complete album** | 50 sections: FIFA intro, 48 national teams across 12 groups, and the Coca-Cola closing section |
| **Dynamic backgrounds** | Each country page adapts colors to its national flag |
| **Sticker search** | Find any country or sticker code instantly |
| **Progress tracking** | Global and per-country progress bars, updated in real time |
| **User accounts** | Register, log in, and keep your collection synced across devices |
| **Mobile-first** | Large touch targets, swipe navigation, works great on any screen size |
| **No external icon libraries** | Pure SVG icons throughout — no runtime dependencies |

---

## How to Use

1. **Open** [albumpanini2026.vercel.app](https://albumpanini2026.vercel.app) in your browser.
2. **Create an account** — click _Register_, enter a username and password.
3. **Browse the album** — swipe or use the arrows to move between sections (FIFA intro → groups A–L → Coca-Cola).
4. **Mark stickers** — tap/click any sticker to toggle it as collected (filled) or missing (empty).
5. **Track progress** — the header bar shows your global completion percentage; each country card shows its own.
6. **Search** — use the search bar to jump directly to any country or sticker code (e.g. `ARG`, `BRA07`).
7. **Profile** — click your avatar to update your username or change your password.

Your collection is saved to your account and available on any device where you log in.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/) + Python 3.11 |
| **ORM** | [SQLAlchemy](https://www.sqlalchemy.org/) |
| **Auth** | JWT via HTTP-only cookies · bcrypt password hashing |
| **Database** | SQLite (development) / PostgreSQL via [Neon](https://neon.tech) (production) |
| **Frontend** | Vanilla JS, CSS custom properties — no frameworks |
| **Deployment** | [Vercel](https://vercel.com) (serverless Python) |

---

## Local Development

### Prerequisites

- Python 3.11+
- Git

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/lopez-matias/world-tracker-album.git
cd world-tracker-album

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env and fill in the values (see Environment Variables below)

# 5. Start the development server
uvicorn app.main:app --reload
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

The SQLite database (`mundial2026.db`) is created automatically on first run — no database setup needed.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | JWT signing secret | `openssl rand -hex 32` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./mundial2026.db` |
| `APP_URL` | Public app URL (used for CORS) | `http://localhost:8000` |

For PostgreSQL (Neon or any provider):

```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/mundial2026?sslmode=require
```

---

## Deploying to Vercel

This project is configured for zero-config deployment on Vercel using `@vercel/python`.

1. Push your repository to GitHub.
2. Import the project at [vercel.com](https://vercel.com).
3. Add environment variables under **Settings → Environment Variables**:
   - `SECRET_KEY`
   - `DATABASE_URL` (must be a PostgreSQL URL — SQLite is not supported on Vercel's read-only filesystem)
   - `APP_URL` (your `*.vercel.app` URL)
4. Click **Deploy**. Every push to `main` triggers an automatic redeploy.

> **Recommended database:** [Neon](https://neon.tech) — free PostgreSQL tier that pairs perfectly with Vercel.

---

## Project Structure

```
world-tracker-album/
├── api/
│   └── index.py              # Vercel serverless entry point
├── app/
│   ├── main.py               # FastAPI app, static mounts, CORS
│   ├── config.py             # Settings loaded from .env
│   ├── database.py           # SQLAlchemy engine & session
│   ├── models.py             # User, UserSticker ORM models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── auth.py               # JWT creation & verification, bcrypt
│   ├── stickers_data.py      # Loads and caches stickers.json
│   └── routers/
│       ├── auth.py           # /api/auth/*
│       ├── stickers.py       # /api/stickers/*
│       └── users.py          # /api/users/*
├── data/
│   └── stickers.json         # 50 sections — full album data
├── frontend/
│   ├── index.html            # Login & registration page
│   ├── album.html            # Main album view
│   ├── profile.html          # User profile & settings
│   ├── css/styles.css
│   └── js/
│       ├── auth.js
│       ├── album.js
│       └── profile.js
├── .env.example
├── requirements.txt
└── vercel.json
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create a new account |
| `POST` | `/api/auth/login` | — | Log in (sets HTTP-only cookie) |
| `POST` | `/api/auth/logout` | Required | Clear auth cookie |
| `GET` | `/api/auth/me` | Required | Current authenticated user |
| `GET` | `/api/stickers/progress` | Required | Global collection progress |
| `GET` | `/api/stickers/{code}` | Required | Stickers for a specific country |
| `POST` | `/api/stickers/toggle` | Required | Mark / unmark a sticker as collected |
| `PATCH` | `/api/users/profile` | Required | Update username |
| `PATCH` | `/api/users/password` | Required | Change password |

---

## Sticker Data Format

Each section in `data/stickers.json` follows this structure:

```json
{
  "code": "ARG",
  "name": "Argentina",
  "flag_emoji": "🇦🇷",
  "flag_colors": ["#74ACDF", "#FFFFFF", "#F6B40E"],
  "group": "J",
  "stickers": [
    { "code": "ARG01", "label": "Escudo",          "type": "badge"  },
    { "code": "ARG02", "label": "",                "type": "player" },
    { "code": "ARG13", "label": "Foto del equipo", "type": "group"  }
  ]
}
```

| Field | Description |
|---|---|
| `code` | Unique 3-letter country/section code |
| `flag_colors` | Hex colors used to generate the dynamic page background |
| `group` | World Cup group (A–L) |
| `stickers[].type` | `badge`, `player`, `group`, or `special` |

---

## Security

- Never commit your `.env` file — it is listed in `.gitignore`.
- If a `SECRET_KEY` or any credential is accidentally exposed, rotate it immediately.
- Generate a strong secret with: `openssl rand -hex 32`

---

## License

[MIT](LICENSE)
