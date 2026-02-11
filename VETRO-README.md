# 🎬 Vetro — Self-Hosted Movie Streaming Platform

## Architecture

```
vetro/
├── server/             ← Node.js + Express backend
│   ├── index.js        ← Entry point (port 3001)
│   ├── db.js           ← JSON database module (atomic writes)
│   ├── data/
│   │   └── db.json     ← Auto-created on first run
│   ├── storage/
│   │   └── films/      ← Video file storage
│   └── routes/
│       ├── profiles.js
│       └── interactions.js
├── src/                ← React frontend (Vite)
├── dist/               ← Built frontend (after `npm run build`)
└── package.json        ← Frontend deps
```

## Prerequisites

- **Node.js** 18+ (with `--watch` support)
- **npm** or **bun**

## Setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd server
npm install
cd ..
```

### 3. Configure API URL

Create/edit `.env` in the project root:

```env
VITE_API_URL=http://localhost:3001
```

### 4. Run both servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:3001

### Production Build

```bash
npm run build
cd server
npm start
```

The backend serves the built frontend from `dist/` automatically.

## Database

All data is stored in `server/data/db.json`:
- Profiles, watch history, likes, surveys, events, my list
- Atomic writes (temp file → rename) prevent corruption
- Write queue prevents concurrent overwrites

### Export / Import

```bash
# Export
curl http://localhost:3001/api/export -o backup.json

# Import
curl -X POST http://localhost:3001/api/import \
  -H "Content-Type: application/json" \
  -d @backup.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profiles` | List profiles |
| POST | `/api/profiles` | Create profile |
| DELETE | `/api/profiles/:id` | Delete profile |
| POST | `/api/profiles/:id/activate` | Set last active |
| GET | `/api/profiles/:id/my-list` | Get my list |
| POST | `/api/profiles/:id/my-list/add` | Add to list |
| POST | `/api/profiles/:id/my-list/remove` | Remove from list |
| GET | `/api/profiles/:id/film/:fid/rating` | Get rating |
| POST | `/api/profiles/:id/film/:fid/rating` | Save rating/survey |
| GET | `/api/profiles/:id/film/:fid/progress` | Get watch progress |
| POST | `/api/profiles/:id/film/:fid/progress` | Update progress |
| POST | `/api/profiles/:id/film/:fid/event` | Log play event |
| GET | `/api/profiles/:id/continue-watching` | Continue watching |
| GET | `/api/profiles/:id/watch-history` | Full watch history |
| GET | `/api/export` | Download db.json |
| POST | `/api/import` | Restore db.json |
| GET | `/api/health` | Health check |
