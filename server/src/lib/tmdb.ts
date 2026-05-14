import axios from "axios";
import { getEnv } from "@/utils";

const TMDB_BASE = "https://api.themoviedb.org/3";

const tmdb = axios.create({
  baseURL: TMDB_BASE,
  params: { api_key: getEnv("TMDB_API_KEY"), language: "it-IT" },
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

export async function getRandomMovie(): Promise<MovieData> {
  const totalPages = 500;

  const page = Math.floor(Math.random() * totalPages) + 1;

  const { data } = await tmdb.get("/movie/popular", {
    params: { page },
  });

  const movies: TMDBMovie[] = data.results;
  const movie = movies[Math.floor(Math.random() * movies.length)];

  if (!movie) {
    return getRandomMovie();
  }

  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview || "Nessuna descrizione disponibile.",
    poster: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null,
    rating: movie.vote_average,
  };
}

export async function getMovieById(id: number): Promise<MovieData | null> {
  try {
    const { data } = await tmdb.get(`/movie/${id}`);
    return {
      id: data.id,
      title: data.title,
      overview: data.overview || "Nessuna descrizione disponibile.",
      poster: data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null,
      rating: data.vote_average,
    };
  } catch {
    return null;
  }
}
