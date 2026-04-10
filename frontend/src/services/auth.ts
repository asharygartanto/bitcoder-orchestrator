import api from './api';
import type { AuthResponse, LoginDto, RegisterDto, User } from '../types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password });
  return data;
}

export async function register(email: string, name: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', { email, name, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/api/auth/me');
  return data;
}

export async function handleGoogleCallback(token: string): Promise<void> {
  localStorage.setItem('bitcoder_token', token);
}
