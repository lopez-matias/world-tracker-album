# Mundial 2026 — Álbum de Figuritas Tracker

Seguí tu progreso del álbum Panini del Mundial 2026. 48 selecciones, 20 figuritas cada una, 960 en total.

## Instalación local

```bash
# 1. Clonar y entrar al directorio
cd mundial2026-tracker

# 2. Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 5. Correr el servidor
uvicorn app.main:app --reload
```

Abrí http://localhost:8000

## Configurar SendGrid (opcional)

1. Crear cuenta en [sendgrid.com](https://sendgrid.com)
2. Generar API Key en Settings → API Keys
3. Verificar tu dominio o email remitente
4. Agregar al `.env`:
   ```
   SENDGRID_API_KEY=SG.tu-api-key
   FROM_EMAIL=noreply@tudominio.com
   APP_URL=https://tudominio.com
   ```

Sin SendGrid configurado, los links de recuperación se imprimen en la consola del servidor (útil para desarrollo).

## Actualizar jugadores en stickers.json

Editá `data/stickers.json`. Cada país tiene esta estructura:

```json
{
  "code": "ARG",
  "name": "Argentina",
  "flag_emoji": "🇦🇷",
  "flag_colors": ["#74ACDF", "#FFFFFF"],
  "stickers": [
    {"code": "ARG1",  "label": "Escudo",   "type": "badge"},
    {"code": "ARG2",  "label": "Foto grupal", "type": "group"},
    {"code": "ARG17", "label": "L. Messi", "type": "player"}
  ]
}
```

Los `type` disponibles son `badge`, `group` y `player`.  
Los códigos de figurita deben ser únicos globalmente.

## Deploy en Railway

1. Push del repo a GitHub
2. Crear nuevo proyecto en [railway.app](https://railway.app)
3. Conectar el repo
4. Agregar las variables de entorno en Railway
5. El `Procfile` o el comando de inicio: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Deploy en Vercel

Vercel no soporta FastAPI directamente. Usá Railway, Render o Fly.io para apps Python con SQLite.

## Generar SECRET_KEY

```bash
openssl rand -hex 32
```

## Estructura del proyecto

```
mundial2026-tracker/
├── app/
│   ├── main.py           # FastAPI app, rutas de archivos estáticos
│   ├── database.py       # Conexión SQLAlchemy
│   ├── models.py         # User, UserSticker
│   ├── schemas.py        # Pydantic models
│   ├── auth.py           # JWT, bcrypt
│   ├── config.py         # Settings desde .env
│   ├── email_service.py  # SendGrid
│   ├── stickers_data.py  # Lee stickers.json
│   └── routers/
│       ├── auth.py       # /api/auth/*
│       ├── stickers.py   # /api/stickers/*
│       └── users.py      # /api/users/*
├── frontend/
│   ├── index.html        # Login / Register / Reset password
│   ├── album.html        # Álbum principal
│   ├── profile.html      # Perfil de usuario
│   ├── css/styles.css
│   └── js/
│       ├── auth.js
│       ├── album.js
│       └── profile.js
├── data/
│   └── stickers.json     # 48 países × 20 figuritas
├── .env.example
├── requirements.txt
└── README.md# world-tacker-album
