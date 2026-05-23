import axios from 'axios';
import type { User, RandomMovie, GuessResult, Game, RankingEntry, AdminUser, MatchHistory, FriendUser, FriendRequest, FriendStatusResult, LobbyPublic } from '../types';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export async function login(username: string, password: string): Promise<{ user: User; token: string }> {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
}

export async function register(username: string, email: string, password: string): Promise<{ user: User; token: string }> {
  const { data } = await api.post('/auth/register', { username, email, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function getRandomMovie(): Promise<RandomMovie> {
  const { data } = await api.get('/games/random');
  return data;
}

export async function submitGuess(params: {
  movieId: number;
  movieTitle: string;
  moviePoster?: string | null;
  movieOverview?: string | null;
  userRating: number;
}): Promise<GuessResult> {
  const { data } = await api.post('/games/guess', params);
  return data;
}

export async function getHistory(page = 1): Promise<{ games: Game[]; total: number; page: number; totalPages: number }> {
  const { data } = await api.get(`/games/history?page=${page}`);
  return data;
}

export async function getRanking(): Promise<RankingEntry[]> {
  const { data } = await api.get('/ranking');
  return data;
}

export async function getProfile(): Promise<User & { totalScore: number; gamesPlayed: number }> {
  const { data } = await api.get('/profile');
  return data;
}

export async function updateProfile(params: {
  username?: string;
  email?: string;
  password?: string;
  avatar?: string;
}): Promise<User> {
  const { data } = await api.put('/profile', params);
  return data;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get('/admin/users');
  return data;
}

export async function updateUserRole(id: number, role: 'USER' | 'ADMIN'): Promise<User> {
  const { data } = await api.put(`/admin/users/${id}/role`, { role });
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

export async function getMatchHistory(): Promise<MatchHistory[]> {
  const { data } = await api.get('/matches/history');
  return data;
}

// ── Friends ──────────────────────────────────────────────────────────────────

export async function getFriends(): Promise<FriendUser[]> {
  const { data } = await api.get('/friends');
  return data;
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  const { data } = await api.get('/friends/requests');
  return data;
}

export async function getFriendStatus(userId: number): Promise<FriendStatusResult> {
  const { data } = await api.get(`/friends/status/${userId}`);
  return data;
}

export async function sendFriendRequest(receiverId: number): Promise<FriendRequest> {
  const { data } = await api.post('/friends/request', { receiverId });
  return data;
}

export async function acceptFriendRequest(id: number): Promise<FriendRequest> {
  const { data } = await api.put(`/friends/${id}/accept`);
  return data;
}

export async function deleteFriendRequest(id: number): Promise<void> {
  await api.delete(`/friends/${id}`);
}

// ── Lobbies ──────────────────────────────────────────────────────────────────

export async function getOpenLobbies(): Promise<LobbyPublic[]> {
  const { data } = await api.get('/lobbies');
  return data;
}
