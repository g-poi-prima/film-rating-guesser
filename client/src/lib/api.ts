import axios from 'axios';
import type { User } from '../types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
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