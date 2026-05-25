import type { AuthUser } from '@/types/auth';

// ── State ────────────────────────────────────────────────────────────────────

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

export const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
};

// ── Actions ──────────────────────────────────────────────────────────────────

export type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: AuthUser }
  | { type: 'LOGOUT' };

// ── Reducer ──────────────────────────────────────────────────────────────────

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { user: action.payload, isAuthenticated: true };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false };
    default:
      return state;
  }
}
