# Deployment Guide

## Local development (Docker + npm)

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- A TMDB API key — get one free at https://www.themoviedb.org/settings/api

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

This starts a PostgreSQL 15 container on port 5432 with:
- user: `postgres`
- password: `postgres`
- database: `film_rating_guessr`

### 2. Configure the server

```bash
cd server
cp .env.example .env
```

Edit `.env` and set:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/film_rating_guessr"
JWT_SECRET="pick-a-long-random-string"
PORT=3000
TMDB_API_KEY="your-key-here"
```

### 3. Install & migrate

```bash
cd server
npm install
npx prisma migrate dev --name init
```

### 4. Start the server

```bash
# Development (auto-recompile on save)
npm run dev

# Or build + run
npm run build && npm start
```

Server runs on `http://localhost:3000`.

### 5. Start the client

In a new terminal:

```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:5173`. The Vite dev server proxies `/api/*` to `http://localhost:3000`.

---

## Creating the first admin

After registering an account, promote it via psql or any PostgreSQL client:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE username = 'your_username';
```

Or with the Prisma studio:

```bash
cd server
npx prisma studio
```

---

## Production deployment

### Backend (e.g. Railway, Render, Fly.io)

1. Set all env vars from `.env.example` in the platform dashboard
2. Set `NODE_ENV=production`
3. Build command: `npm run build`
4. Start command: `npm start`
5. Run migrations on first deploy: `npx prisma migrate deploy`

### Frontend (e.g. Vercel, Netlify)

1. Build command: `npm run build` (output: `dist/`)
2. Set `VITE_API_URL` env var if your backend is on a different origin (update `client/src/lib/api.ts` baseURL accordingly)
3. Add a rewrite rule: all paths → `index.html` (for React Router)

### Environment variables summary

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | server | PostgreSQL connection string |
| `JWT_SECRET` | server | Secret for signing JWTs — keep private |
| `PORT` | server | HTTP port (default: 3000) |
| `TMDB_API_KEY` | server | TMDB API key |
| `NODE_ENV` | server | `development` or `production` |
