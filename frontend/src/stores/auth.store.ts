import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user, token) => {
    localStorage.setItem('bitcoder_token', token);
    localStorage.setItem('bitcoder_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isHydrated: true });
  },

  logout: () => {
    localStorage.removeItem('bitcoder_token');
    localStorage.removeItem('bitcoder_user');
    set({ user: null, token: null, isAuthenticated: false, isHydrated: true });
  },

  hydrate: () => {
    const token = localStorage.getItem('bitcoder_token');
    const userStr = localStorage.getItem('bitcoder_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true, isHydrated: true });
      } catch {
        localStorage.removeItem('bitcoder_token');
        localStorage.removeItem('bitcoder_user');
        set({ isHydrated: true });
      }
    } else {
      set({ isHydrated: true });
    }
  },
}));
