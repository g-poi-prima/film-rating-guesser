import axios from "axios";
import { getEnv } from "@/utils";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_TOTAL_PAGES = 500;
const MAX_FETCH_ATTEMPTS = 5;

const tmdb = axios.create({
  baseURL: TMDB_BASE,
  params: { language: "it-IT" },
  headers: { Authorization: `Bearer ${getEnv("TMDB_API_KEY")}` },
});

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
}

export interface MovieData {
  id: number;
  title: string;
  overview: string;
  poster: string | null;
  rating: number;
}

function normalize(m: TMDBMovie): MovieData {
  return {
    id: m.id,
    title: m.title,
    overview: m.overview || "Nessuna descrizione disponibile.",
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    rating: m.vote_average,
  };
}

export async function getRandomMovie(): Promise<MovieData> {
  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
    const page = Math.floor(Math.random() * TMDB_TOTAL_PAGES) + 1;
    const { data } = await tmdb.get<{ results: TMDBMovie[] }>("/movie/popular", { params: { page } });
    const movies = data.results;
    if (movies.length > 0) {
      const movie = movies[Math.floor(Math.random() * movies.length)];
      if (movie) return normalize(movie);
    }
  }
  throw new Error("Unable to fetch a random movie from TMDB after multiple attempts");
}

export async function getMovieById(id: number): Promise<MovieData | null> {
  try {
    const { data } = await tmdb.get<TMDBMovie>(`/movie/${id}`);
    return normalize(data);
  } catch {
    return null;
  }
}
