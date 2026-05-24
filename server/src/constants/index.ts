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

// ── TMDB movie modes ──────────────────────────────────────────────────────────
/** Pages 1-N of /movie/popular (fully random, includes obscure entries). */
export const TMDB_ANY_MAX_PAGES = 500;
/** Max page used for the "popular" discover mode (vote_count >= threshold). */
export const TMDB_POPULAR_MAX_PAGES = 100;
/** Minimum TMDB vote count for a film to be considered well-known. */
export const TMDB_POPULAR_MIN_VOTES = 1_000;
