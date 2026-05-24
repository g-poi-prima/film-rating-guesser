export const PORT = parseInt(process.env.PORT ?? "3000");

// ── Game ──────────────────────────────────────────────────────────────────────
export const TOTAL_ROUNDS = 5;
export const ROUND_TRANSITION_MS = 4_000;

// ── Auth ─────────────────────────────────────────────────────────────────────
export const JWT_EXPIRES_IN = "7d";
export const BCRYPT_ROUNDS = 10;

// ── Pagination ────────────────────────────────────────────────────────────────
export const HISTORY_PAGE_SIZE = 10;
export const MATCH_HISTORY_LIMIT = 20;
