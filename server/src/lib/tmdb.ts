import axios from "axios";
import { getEnv } from "@/utils";
import {
  TMDB_ANY_MAX_PAGES,
  TMDB_POPULAR_MAX_PAGES,
  TMDB_POPULAR_MIN_VOTES,
} from "@/constants";

const TMDB_BASE = "https://api.themoviedb.org/3";
const MAX_FETCH_ATTEMPTS = 5;

const tmdb = axios.create({
  baseURL: TMDB_BASE,
  params: { language: "it-IT" },
  headers: { Authorization: `Bearer ${getEnv("TMDB_API_KEY")}` },
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
}

interface TMDBPageResult {
  results: TMDBMovie[];
  total_pages: number;
}

export interface MovieData {
  id: number;
  title: string;
  overview: string;
  poster: string | null;
  rating: number;
}

/**
 * "any"     – picks a random page (1–500) from /movie/popular.
 *             Wide pool, includes less-known films.
 *
 * "popular" – picks a random page (1–100) from /discover/movie filtered by
 *             vote_count >= 1 000 and sorted by popularity desc.
 *             Guarantees the film has many ratings and is widely known.
 */
export type MovieMode = "any" | "popular";

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(m: TMDBMovie): MovieData {
  return {
    id: m.id,
    title: m.title,
    overview: m.overview || "Nessuna descrizione disponibile.",
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    rating: m.vote_average,
  };
}

function randomPage(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch a random movie.
 * @param mode "popular" (default) — well-known films only; "any" — fully random.
 */
export async function getRandomMovie(mode: MovieMode = "popular"): Promise<MovieData> {
  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      let movies: TMDBMovie[];

      if (mode === "popular") {
        const page = randomPage(TMDB_POPULAR_MAX_PAGES);
        const { data } = await tmdb.get<TMDBPageResult>("/discover/movie", {
          params: {
            sort_by: "popularity.desc",
            "vote_count.gte": TMDB_POPULAR_MIN_VOTES,
            "vote_average.gte": 5.0,
            page,
          },
        });
        // Cap to actual page count on first attempt
        if (data.total_pages === 0) continue;
        if (page > data.total_pages) {
          // Re-request a valid page
          const validPage = randomPage(Math.min(data.total_pages, TMDB_POPULAR_MAX_PAGES));
          const retry = await tmdb.get<TMDBPageResult>("/discover/movie", {
            params: {
              sort_by: "popularity.desc",
              "vote_count.gte": TMDB_POPULAR_MIN_VOTES,
              "vote_average.gte": 5.0,
              page: validPage,
            },
          });
          movies = retry.data.results;
        } else {
          movies = data.results;
        }
      } else {
        // "any" mode – original behavior
        const page = randomPage(TMDB_ANY_MAX_PAGES);
        const { data } = await tmdb.get<TMDBPageResult>("/movie/popular", {
          params: { page },
        });
        movies = data.results;
      }

      if (movies.length === 0) continue;
      const movie = movies[Math.floor(Math.random() * movies.length)];
      if (movie) return normalize(movie);
    } catch {
      // Network / API error – retry
    }
  }

  throw new Error(
    `Unable to fetch a random movie from TMDB after ${MAX_FETCH_ATTEMPTS} attempts (mode: ${mode})`
  );
}

export async function getMovieById(id: number): Promise<MovieData | null> {
  try {
    const { data } = await tmdb.get<TMDBMovie>(`/movie/${id}`);
    return normalize(data);
  } catch {
    return null;
  }
}
