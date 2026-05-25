import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  children: ReactNode;
  /** One role (string) or a list — user must have AT LEAST ONE of them */
  requireRole?: string | string[];
}

export default function ProtectedRoute({ children, requireRole }: Props) {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    const allowed = roles.some((r) => hasRole(r));
    if (!allowed) return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
