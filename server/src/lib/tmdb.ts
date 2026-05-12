import axios from "axios";
import { getEnv } from "@/utils";

const TMDB_BASE = "https://api.themoviedb.org/3";
const tmdb = axios.create({
  baseURL: TMDB_BASE,
  params: { api_key: getEnv("TMDB_API_KEY"), language: "it-IT" },
});

interface TMDBMovie {
  id: number; title: string; overview: string;
  poster_path: string | null; vote_average: number;
}

export interface MovieData {
  id: number; title: string; overview: string;
  poster: string | null; rating: number;
}

export async function getRandomMovie(): Promise<MovieData> {
  const page = Math.floor(Math.random() * 500) + 1;
  const { data } = await tmdb.get("/movie/popular", { params: { page } });
  const movies: TMDBMovie[] = data.results;
  const movie = movies[Math.floor(Math.random() * movies.length)];
  if (!movie) return getRandomMovie();
  return {
    id: movie.id, title: movie.title,
    overview: movie.overview || "Nessuna descrizione disponibile.",
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
    rating: movie.vote_average,
  };
}