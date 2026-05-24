# Deployment Guide

## Local development (Docker + npm)

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- A TMDB **Read Access Token** — see note below

> **NixOS?** A `flake.nix` is included in `server/`. Use `nix develop` before any `npm` or `prisma` command, or prepend `nix develop --command` to run commands directly (e.g. `nix develop --command npm run dev`). The flake provides `prisma-engines` and sets the required environment variables automatically.

> **TMDB API key vs Read Access Token**
> Go to https://www.themoviedb.org/settings/api and copy the **"API Read Access Token (v4 auth)"** — the long string starting with `eyJ...`.
> Do **not** use the short "API Key (v3 auth)"; the server uses `Authorization: Bearer` which requires the v4 token.

---

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
TMDB_API_KEY="eyJ..."   # paste your Read Access Token here
```

### 3. Install dependencies

```bash
cd server
npm install
```

`prisma generate` runs automatically via the `postinstall` script — no need to run it manually.

> **NixOS:** Run `nix develop --command npm install` instead.

### 4. Run database migrations

Only needed the first time, or after changes to `schema.prisma`:

```bash
npx prisma migrate dev --name init
```

> **NixOS:** Run `nix develop --command npx prisma migrate dev --name init` instead.

### 5. Start the server

```bash
# Development (auto-recompile on save)
npm run dev

# Or build + run
npm run build && npm start
```

> **NixOS:** Run `nix develop --command npm run dev` (or `nix develop` first, then `npm run dev`).

Server runs on `http://localhost:3000`.

### 6. Start the client

In a new terminal:

```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:5173`. The Vite dev server proxies `/api/*` to `http://localhost:3000` automatically — no extra config needed.

---

## Creating the first admin

After registering an account, promote it via psql or any PostgreSQL client:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE username = 'your_username';
```

Or with Prisma Studio:

```bash
cd server
npx prisma studio
```

> **NixOS:** Run `nix develop --command npx prisma studio` instead.

---

## Production deployment

### Backend (e.g. Railway, Render, Fly.io)

1. Set all env vars from `.env.example` in the platform dashboard
2. Set `NODE_ENV=production`
3. Build command: `npm run build`
4. Start command: `npm start`
5. Run on first deploy: `npx prisma migrate deploy`

### Frontend (e.g. Vercel, Netlify)

The client calls `/api/*` relative to its own origin. In production this means the frontend and backend must share the same domain (e.g. behind a reverse proxy), **or** you update `baseURL` in `client/src/lib/api.ts` to the absolute backend URL before building.

1. Update `baseURL` in `client/src/lib/api.ts` if the backend is on a different domain:
   ```ts
   const api = axios.create({ baseURL: "https://your-backend.com/api" });
   ```
2. Build command: `npm run build` (output: `dist/`)
3. Add a rewrite rule so all paths serve `index.html` (required for React Router)

### Environment variables summary

| Variable       | Where  | Description                                    |
| -------------- | ------ | ---------------------------------------------- |
| `DATABASE_URL` | server | PostgreSQL connection string                   |
| `JWT_SECRET`   | server | Secret for signing JWTs — keep private         |
| `PORT`         | server | HTTP port (default: 3000)                      |
| `TMDB_API_KEY` | server | TMDB Read Access Token (v4, starts with `eyJ`) |
| `NODE_ENV`     | server | `development` or `production`                  |
