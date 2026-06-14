import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
  setAccessToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  login: (accessToken, user) => set({
    accessToken,
    user,
    isAuthenticated: true
  }),
  logout: () => set({
    accessToken: null,
    user: null,
    isAuthenticated: false
  }),
  setAccessToken: (token) => set((state) => ({
    accessToken: token,
    isAuthenticated: token !== null,
    // Keep user state if it exists, otherwise leave unchanged
    user: token === null ? null : state.user
  }))
}));
