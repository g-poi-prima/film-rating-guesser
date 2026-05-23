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
  matchRoundsPlayed: number;
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

export interface MatchRoundEntry {
  roundNumber: number;
  movieTitle: string;
  moviePoster?: string | null;
  realRating: number;
  myRating: number | null;
  myScore: number | null;
  opponentRating: number | null;
  opponentScore: number | null;
}

export interface MatchHistory {
  id: number;
  status: string;
  totalRounds: number;
  roundsPlayed: number;
  myTotalScore: number | null;
  opponentTotalScore: number | null;
  opponent: { id: number; username: string; avatar: string | null } | null;
  createdAt: string;
  rounds: MatchRoundEntry[];
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

export interface FriendUser {
  id: number;
  username: string;
  avatar: string | null;
}

export interface FriendRequest {
  id: number;
  senderId: number;
  receiverId: number;
  status: 'PENDING' | 'ACCEPTED';
  sender?: FriendUser;
  receiver?: FriendUser;
}

export type FriendStatus = 'friends' | 'request_sent' | 'request_received' | null;

export interface FriendStatusResult {
  status: FriendStatus;
  requestId?: number;
}

export interface LobbyPlayer {
  userId: number;
  username: string;
  totalScore: number;
  eliminated: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatar?: string | null;
  createdAt?: string;
  // Solo stats
  totalScore: number;
  gamesPlayed: number;
  // Match stats
  matchesPlayed: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  matchRoundsPlayed: number;
  // Social
  friendCount: number;
}

export interface LobbyHistoryEntry {
  id: number;
  code: string;
  name: string;
  mode: 'ALL_VS_ALL' | 'TOURNAMENT';
  totalRounds: number;
  status: string;
  createdAt: string;
  endedAt: string | null;
  myRank: number;
  myTotalScore: number;
  playerCount: number;
  players: { userId: number; username: string; totalScore: number; rank: number }[];
}

export interface LobbyPublic {
  code: string;
  name: string;
  mode: 'ALL_VS_ALL' | 'TOURNAMENT';
  hostId: number;
  playerCount: number;
  players: LobbyPlayer[];
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  currentRound: number;
  totalRounds: number;
}
