# Acoustom — Virtual Speaker Room Simulator

Acoustom lets users approximate how a selected loudspeaker will sound in their own room using acoustic simulation.

## Tech Stack

### Frontend (`apps/frontend`)
- **React 18** — UI framework
- **Vite 6** — Build tool and dev server
- **TypeScript 5.6** — Type safety
- **Tailwind CSS 3.4** — Styling
- **React Router 7** — Client-side routing
- **Zustand 5** — State management
- **Lucide React** — Icons
- **SVG** — 2D room editor
- **Web Audio API** — Audio playback and convolution

### Backend (`apps/backend`)
- **Python 3.10+** — Runtime
- **FastAPI** — Web framework
- **SQLAlchemy 2.0** — ORM (async)
- **Alembic** — Database migrations
- **pyroomacoustics** — Acoustic simulation engine
- **NumPy / SciPy** — Numerical computing
- **libsndfile / SoundFile** — Audio I/O
- **librosa** — Audio analysis
- **pydantic-settings** — Configuration

### Database
- **PostgreSQL 16** (via **Neon** in production, Docker locally)

### Infrastructure
- **Docker & Docker Compose** — Local development
- **Turborepo** — Monorepo orchestration
- **pnpm** — Package manager
- **Ruff** — Python linting
- **ESLint + Prettier** — JS/TS linting and formatting
- **pytest** — Testing

## Monorepo Structure

```
Acoustom/
├── package.json          # Root workspace config
├── turbo.json            # Turborepo pipeline
├── pnpm-workspace.yaml   # pnpm workspace definition
├── apps/
│   ├── frontend/         # React + Vite + TS app
│   └── backend/          # FastAPI + pyroomacoustics app
├── packages/
│   └── types/            # Shared TypeScript types
└── infra/
    ├── docker-compose.yml
    ├── docker-compose.prod.yml
    ├── Dockerfile.backend
    └── Dockerfile.frontend
```

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Python** >= 3.10
- **Docker & Docker Compose** (for database and local backend)

## Installation

```bash
# Install Node dependencies
pnpm install

# Install Python dependencies (backend)
cd apps/backend
pip install -e ".[dev]"
cd ../..

# Start PostgreSQL
docker compose -f infra/docker-compose.yml up -d postgres

# Run database migrations
cd apps/backend
alembic upgrade head
cd ../..

# Seed initial speaker data
cd apps/backend
python seed.py
cd ../..

# Start frontend dev server
pnpm dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |
| `pnpm format` | Format all code with Prettier |
| `pnpm clean` | Clean build artifacts |

## Environment Variables

### Backend (`apps/backend/.env`)
```
DATABASE_URL=postgresql+psycopg2://acoustom:acoustom@localhost:5432/acoustom
CORS_ORIGINS=["http://localhost:3000"]
UPLOAD_DIR=/tmp/acoustom-uploads
SIMULATION_TIMEOUT=300
```

### Frontend (`apps/frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:8000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/speakers` | List all speakers |
| GET | `/speakers/{id}` | Get speaker details |
| POST | `/simulate` | Compute room impulse responses from a JSON room configuration |
| GET | `/health` | Health check |

## Architecture

```text
React + Vite + TypeScript
          |
          | simulation request
          v
       FastAPI
          |
     ┌────┴─────┐
     │          │
     v          v
   Neon    pyroomacoustics
                |
                v
       Room Impulse Response
                |
                v
             Browser
                |
         Web Audio API
                |
                v
          🎧 Playback
```

## Dependencies Summary

### Node Dependencies (Frontend)
- react, react-dom
- react-router-dom
- zustand
- lucide-react
- vite, @vitejs/plugin-react
- typescript
- tailwindcss, postcss, autoprefixer
- eslint, prettier

### Python Dependencies (Backend)
- fastapi[standard]
- sqlalchemy[asyncio]
- alembic
- psycopg2-binary
- pyroomacoustics
- numpy
- scipy
- soundfile
- librosa
- python-dotenv
- python-multipart
- pydantic-settings
- uvicorn (via fastapi[standard])

## Development Notes

- The backend runs on port 8000
- The frontend runs on port 3000 and proxies `/api` to the backend
- Database migrations are managed by Alembic (`alembic upgrade head`)
- Listening tracks stay in the browser; only room geometry is sent to the backend
- Room changes automatically refresh the RIR after a short debounce
- The frontend applies RIRs using `ConvolverNode` in the Web Audio API

## License

MIT
