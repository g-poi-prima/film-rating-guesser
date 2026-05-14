export interface User {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatar?: string | null;
  createdAt?: string;
}

export interface Game {
  id: number;
  userId: number;
  movieId: number;
  movieTitle: string;
  moviePoster?: string | null;
  movieOverview?: string | null;
  userRating: number;
  realRating: number;
  score: number;
  createdAt: string;
}

export interface RankingEntry {
  id: number;
  username: string;
  avatar?: string | null;
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
}

export interface RandomMovie {
  id: number;
  title: string;
  overview: string;
  poster?: string | null;
}

export interface GuessResult {
  game: Game;
  realRating: number;
  score: number;
  diff: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatar?: string | null;
  createdAt: string;
  _count: { games: number };
}
