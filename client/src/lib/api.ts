import axios from 'axios';
import type { User, RandomMovie, GuessResult, Game, RankingEntry, AdminUser, MatchHistory, FriendUser, FriendRequest, FriendStatusResult, LobbyPublic, UserProfile, LobbyHistoryEntry, MoviePair } from '../types';
import { ensureInit, encryptPayload, decryptPayload, getSessionId } from './crypto';

const api = axios.create({
  baseURL: '/api',
});

// ── Request interceptor: attach auth token + encrypt body ────────────────────
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Encrypt body for mutating requests
  const method = config.method?.toUpperCase();
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && config.data !== undefined) {
    await ensureInit();
    const sessionId = getSessionId();
    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
      config.data = await encryptPayload(config.data);
    }
  }

  // Attach session ID on all requests so the server can encrypt responses
  if (!config.headers['X-Session-Id']) {
    const sessionId = getSessionId();
    if (sessionId) config.headers['X-Session-Id'] = sessionId;
  }

  return config;
});

// ── Response interceptor: decrypt body + handle 401 ─────────────────────────
api.interceptors.response.use(
  async (res) => {
    if (res.data && res.data.encrypted === true) {
      res.data = await decryptPayload(res.data);
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      const url: string = err.config?.url ?? '';
      const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
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

export async function getRandomMovie(mode: 'popular' | 'any' = 'popular'): Promise<RandomMovie> {
  const { data } = await api.get('/games/random', { params: { mode } });
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

export async function getProfile(): Promise<UserProfile> {
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

export async function getLobbyHistory(): Promise<LobbyHistoryEntry[]> {
  const { data } = await api.get('/matches/lobby-history');
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

export async function searchUsers(q: string): Promise<{ id: number; username: string; avatar: string | null }[]> {
  const { data } = await api.get('/friends/search', { params: { q } });
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

export async function getMoviePair(mode: 'popular' | 'any' = 'popular'): Promise<MoviePair> {
  const { data } = await api.get('/games/pair', { params: { mode } });
  return data;
}

// ── Lobbies ──────────────────────────────────────────────────────────────────

export async function getOpenLobbies(): Promise<LobbyPublic[]> {
  const { data } = await api.get('/lobbies');
  return data;
}
