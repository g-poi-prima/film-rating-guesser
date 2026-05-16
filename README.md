# Film Rating Guessr

A full-stack web app where you guess a movie's real rating, score points based on accuracy, and compete with other users on a global leaderboard.

## Features

- **Gameplay** — get a random movie (poster + description), submit your rating guess, see the real TMDB score and your points
- **Scoring** — 100pts for ≤0.5 diff, 80pts for ≤1, 60pts for ≤2, 40pts for ≤3, 20pts for ≤4, 0pts otherwise
- **Ranking** — global leaderboard sorted by total score
- **History** — paginated log of all your games
- **Profile** — update username, email, password
- **Admin panel** — manage users and roles
- **Dark/light theme** — persisted to localStorage

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router v7, Axios |
| Backend | Express, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT (7-day tokens, bcryptjs hashing) |
| Movie data | TMDB API |

## Project Structure

```
film-rating-guessr/
├── client/                   # React + Vite frontend
│   └── src/
│       ├── components/       # Navbar, ProtectedRoute
│       ├── context/          # AuthContext, ThemeContext
│       ├── lib/              # api.ts (axios client)
│       ├── pages/            # PlayPage, LoginPage, RegisterPage,
│       │                     # ProfilePage, RankingPage, HistoryPage, AdminPage
│       └── types/            # Shared TypeScript types
└── server/                   # Express + Prisma backend
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── lib/              # prisma.ts, tmdb.ts
        ├── middleware/       # auth.ts, admin.ts
        ├── routes/           # auth, games, ranking, profile, admin
        ├── constants/
        └── utils/
```

## API Endpoints

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me              (auth required)

GET  /api/games/random         (auth required)
POST /api/games/guess          (auth required) — server fetches real rating from TMDB
GET  /api/games/history        (auth required)

GET  /api/ranking

GET  /api/profile              (auth required)
PUT  /api/profile              (auth required)

GET  /api/admin/users          (admin only)
PUT  /api/admin/users/:id/role (admin only)
DEL  /api/admin/users/:id      (admin only)
```

## Quick Start

See [DEPLOYMENT.md](DEPLOYMENT.md) for full setup instructions.

```bash
# 1. Start the database
docker-compose up -d

# 2. Server
cd server && cp .env.example .env   # fill in TMDB_API_KEY and JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run dev

# 3. Client (new terminal)
cd client && npm install && npm run dev
```

App available at `http://localhost:5173`.

## User Roles

- **USER** — play, view ranking, edit profile
- **ADMIN** — everything above + admin panel (promote/demote users, delete accounts)

To make the first admin, run after registering:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE username = 'your_username';
```
