import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute/ProtectedRoute';
import Layout         from '@/components/Layout/Layout';
import Login          from '@/pages/Login/Login';
import Register       from '@/pages/Register/Register';
import Unauthorized   from '@/pages/Unauthorized/Unauthorized';
import NotFound       from '@/pages/NotFound/NotFound';

// ── Shared pages ───────────────────────────────────────────────────────────────
import ChangePassword from '@/pages/ChangePassword/ChangePassword';

// ── USER pages ────────────────────────────────────────────────────────────────
import UserDashboard      from '@/pages/User/UserDashboard';
import TransferPage       from '@/pages/User/TransferPage';
import TransactionHistory from '@/pages/User/TransactionHistory';
import BankStatement      from '@/pages/User/BankStatement';
import Beneficiaries      from '@/pages/User/Beneficiaries';
import OnlineRequests     from '@/pages/User/OnlineRequests';
import UserSupport        from '@/pages/User/UserSupport';
import UserProfile        from '@/pages/User/UserProfile';

// ── ADMIN pages ───────────────────────────────────────────────────────────────
import Dashboard        from '@/pages/Dashboard/Dashboard';
import CustomersList    from '@/pages/Customers/CustomersList';
import CustomerForm     from '@/pages/Customers/CustomerForm';
import CustomerAccounts from '@/pages/Customers/CustomerAccounts';
import AccountSearch    from '@/pages/Accounts/AccountSearch';
import AccountDetails   from '@/pages/Accounts/AccountDetails';
import AdminApprovals   from '@/pages/Admin/AdminApprovals';
import AdminSupport     from '@/pages/Admin/AdminSupport';
import AdminOperations  from '@/pages/Admin/AdminOperations';

// ── SUPER_ADMIN pages ─────────────────────────────────────────────────────────
import Users        from '@/pages/Users/UsersList';
import AuditLogs    from '@/pages/SuperAdmin/AuditLogs';
import SystemConfig from '@/pages/SuperAdmin/SystemConfig';

// ── Route tree ────────────────────────────────────────────────────────────────

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect — handled after auth check in Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login"        element={<Login />} />
      <Route path="/register"     element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ═══════════════════════════════════════════════════════════════════════
          👤  USER  (CLIENT) — /user/*
          ═══════════════════════════════════════════════════════════════════════ */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/user/dashboard"     element={<UserDashboard />} />
        <Route path="/user/transfer"      element={<TransferPage />} />
        <Route path="/user/history"       element={<TransactionHistory />} />
        <Route path="/user/statement"     element={<BankStatement />} />
        <Route path="/user/beneficiaries" element={<Beneficiaries />} />
        <Route path="/user/requests"      element={<OnlineRequests />} />
        <Route path="/user/support"       element={<UserSupport />} />
        <Route path="/user/profile"       element={<UserProfile />} />
      </Route>

      {/* ═══════════════════════════════════════════════════════════════════════
          🛠️  ADMIN — /admin/*
          ═══════════════════════════════════════════════════════════════════════ */}
      <Route
        element={
          <ProtectedRoute requireRole={['ADMIN', 'SUPER_ADMIN']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard"                      element={<Dashboard />} />
        <Route path="/admin/customers"                      element={<CustomersList />} />
        <Route path="/admin/customers/new"                  element={<CustomerForm />} />
        <Route path="/admin/customers/:id/accounts"         element={<CustomerAccounts />} />
        <Route path="/admin/accounts"                       element={<AccountSearch />} />
        <Route path="/admin/accounts/:id"                   element={<AccountDetails />} />
        <Route path="/admin/approvals"                      element={<AdminApprovals />} />
        <Route path="/admin/operations"                     element={<AdminOperations />} />
        <Route path="/admin/support"                        element={<AdminSupport />} />
      </Route>

      {/* ═══════════════════════════════════════════════════════════════════════
          👑  SUPER_ADMIN — /superadmin/*
          ═══════════════════════════════════════════════════════════════════════ */}
      <Route
        element={
          <ProtectedRoute requireRole="SUPER_ADMIN">
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Super admin dashboard reuses the same stats dashboard */}
        <Route path="/superadmin/dashboard" element={<Dashboard />} />
        <Route path="/superadmin/users"     element={<Users />} />
        <Route path="/superadmin/audit"     element={<AuditLogs />} />
        <Route path="/superadmin/config"    element={<SystemConfig />} />
      </Route>

      {/* ═══════════════════════════════════════════════════════════════════════
          Shared protected — change password (all roles)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/change-password" element={<ChangePassword />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
