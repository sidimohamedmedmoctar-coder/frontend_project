import {
  createContext,
  useContext,
  useLayoutEffect,
  useReducer,
  type ReactNode,
} from 'react';
import * as authApi from '@/api/auth.api';
import type { AuthUser, DecodedJwt } from '@/types/auth';
import { authReducer, initialAuthState } from './authReducer';
import { logAudit } from '@/utils/auditLogger';

const TOKEN_KEY = 'access_token';

// ── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ── JWT helpers ──────────────────────────────────────────────────────────────

/** Decode a JWT payload without any external library (TP5 : atob / base64) */
function decodeJwt<T>(token: string): T {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64)) as T;
}

function buildUser(token: string): AuthUser | null {
  try {
    const decoded = decodeJwt<DecodedJwt>(token);
    if (decoded.exp * 1000 <= Date.now()) return null;
    return {
      username: decoded.sub,
      roles: decoded.scope ? decoded.scope.split(' ') : [],
      token,
    };
  } catch {
    return null;
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  /**
   * useLayoutEffect (TP2) : restore the session synchronously before the
   * first DOM paint so that ProtectedRoute never flashes the login page.
   */
  useLayoutEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const restored = buildUser(token);
    if (restored) {
      dispatch({ type: 'LOGIN_SUCCESS', payload: restored });
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  async function login(username: string, password: string): Promise<AuthUser> {
    const token = await authApi.login(username, password);
    const next = buildUser(token);
    if (!next) throw new Error('Token invalide reçu du serveur');
    sessionStorage.setItem(TOKEN_KEY, token);
    dispatch({ type: 'LOGIN_SUCCESS', payload: next });
    logAudit({
      level:   'INFO',
      actor:   next.username,
      action:  'LOGIN',
      details: `Connexion réussie — rôles : ${next.roles.join(', ')}`,
    });
    return next;
  }

  function logout(): void {
    if (state.user) {
      logAudit({
        level:   'INFO',
        actor:   state.user.username,
        action:  'LOGOUT',
        details: 'Déconnexion volontaire',
      });
    }
    sessionStorage.removeItem(TOKEN_KEY);
    dispatch({ type: 'LOGOUT' });
  }

  function hasRole(role: string): boolean {
    return state.user?.roles.includes(role) ?? false;
  }

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        hasRole,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
