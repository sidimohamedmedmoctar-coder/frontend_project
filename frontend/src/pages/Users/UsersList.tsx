import { useCallback, useEffect, useRef, useState } from 'react';
import { getUsers, addRole, removeRole, deleteUser } from '@/api/users.api';
import { getCustomers, deleteCustomer } from '@/api/customers.api';
import { purgeUserLocalStorage } from '@/hooks/useRequests';
import { useAuth }  from '@/hooks/useAuth';
import { logAudit } from '@/utils/auditLogger';
import type { AppUser } from '@/types';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog';
import Spinner from '@/components/Spinner/Spinner';
import CreateUserModal from './CreateUserModal';
import styles from './UsersList.module.css';

type DeleteTarget =
  | { type: 'user'; userId: number; username: string; email?: string; label: string }
  | { type: 'role'; userId: number; roleName: string; label: string }

const PAGE_SIZE = 10;

export default function UsersList() {
  const { user: currentUser } = useAuth();
  const actor = currentUser?.username ?? 'admin';

  const [users, setUsers]               = useState<AppUser[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [showCreate, setShowCreate]     = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<DeleteTarget | null>(null);
  const [openRoleDropdown, setOpenRoleDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await getUsers());
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenRoleDropdown(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleAddRole(userId: number, role: string) {
    setOpenRoleDropdown(null);
    try {
      const updated = await addRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      const target = users.find((u) => u.id === userId);
      logAudit({
        level:   'INFO',
        actor,
        action:  'ADD_ROLE',
        details: `Rôle ${role} ajouté à l'utilisateur "${target?.username ?? userId}"`,
      });
    } catch {
      setError(`Impossible d'ajouter le rôle ${role}.`);
    }
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.type === 'user') {
        // 1. Supprimer le compte d'authentification
        await deleteUser(confirmTarget.userId);

        // 2. Supprimer le(s) profil(s) client bancaire associé(s) par email
        if (confirmTarget.email) {
          try {
            const allCustomers = await getCustomers();
            const linked = allCustomers.filter(
              (c) => c.email?.toLowerCase() === confirmTarget.email!.toLowerCase(),
            );
            await Promise.all(
              linked.map((c) => (c.id ? deleteCustomer(c.id) : Promise.resolve())),
            );
          } catch {
            // Non-bloquant
          }
        }

        // 3. Nettoyer les données localStorage
        purgeUserLocalStorage(confirmTarget.username);

        logAudit({
          level:   'WARNING',
          actor,
          action:  'DELETE_USER',
          details: `Utilisateur "${confirmTarget.username}" supprimé — profil bancaire et données effacés`,
        });
        setUsers((prev) => prev.filter((u) => u.id !== confirmTarget.userId));
      } else {
        const updated = await removeRole(confirmTarget.userId, confirmTarget.roleName);
        setUsers((prev) => prev.map((u) => (u.id === confirmTarget.userId ? updated : u)));
        logAudit({
          level:   'WARNING',
          actor,
          action:  'REMOVE_ROLE',
          details: `Rôle ${confirmTarget.roleName} retiré de l'utilisateur #${confirmTarget.userId}`,
        });
      }
    } catch {
      setError('Erreur lors de la suppression.');
    } finally {
      setConfirmTarget(null);
    }
  }

  function getRoleNames(user: AppUser): string[] {
    return user.roles ?? [];
  }

  // ── Filtering + pagination ─────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q),
      )
    : users;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  return (
    <div className={styles.container}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Utilisateurs</h1>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => setShowCreate(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvel utilisateur
        </button>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorMsg}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.centered}><Spinner size={36} /></div>
      ) : (
        <>
          {/* ── Search bar ────────────────────────────────────────────── */}
          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <span className={styles.count}>{filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {filtered.length === 0 ? (
            <p className={styles.emptyMsg}>Aucun utilisateur trouvé.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nom d'utilisateur</th>
                    <th>Email</th>
                    <th>Rôles</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((user) => {
                    const roles       = getRoleNames(user);
                    const isSuperAdmin = roles.includes('SUPER_ADMIN');
                    const canAddAdmin  = !roles.includes('ADMIN');

                    return (
                      <tr key={user.id} className={isSuperAdmin ? styles.rowProtected : ''}>
                        <td>{user.id}</td>
                        <td>
                          <div className={styles.username}>{user.username}</div>
                        </td>
                        <td>
                          <div className={styles.email}>{user.email ?? '—'}</div>
                        </td>
                        <td>
                          <div className={styles.roles}>
                            {roles.map((role) => (
                              <span
                                key={role}
                                className={styles.roleChip}
                                data-role={role}
                              >
                                {role}
                                {/* ✕ interdit sur les lignes SUPER_ADMIN */}
                                {!isSuperAdmin && role !== 'SUPER_ADMIN' && (
                                  <button
                                    type="button"
                                    className={styles.removeRoleBtn}
                                    title={`Retirer ${role}`}
                                    onClick={() =>
                                      setConfirmTarget({
                                        type: 'role',
                                        userId: user.id,
                                        roleName: role,
                                        label: `Retirer le rôle ${role} de ${user.username} ?`,
                                      })
                                    }
                                  >
                                    ✕
                                  </button>
                                )}
                              </span>
                            ))}

                            {/* + Rôle dropdown */}
                            {!isSuperAdmin && (
                              <div
                                className={styles.roleDropdownWrapper}
                                ref={openRoleDropdown === user.id ? dropdownRef : undefined}
                              >
                                {canAddAdmin ? (
                                  <>
                                    <button
                                      type="button"
                                      className={styles.addRoleBtn}
                                      onClick={() =>
                                        setOpenRoleDropdown((prev) =>
                                          prev === user.id ? null : user.id,
                                        )
                                      }
                                    >
                                      + Rôle
                                    </button>
                                    {openRoleDropdown === user.id && (
                                      <div className={styles.dropdown}>
                                        <button
                                          type="button"
                                          className={styles.dropdownItem}
                                          onClick={() => handleAddRole(user.id, 'ADMIN')}
                                        >
                                          ADMIN
                                        </button>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className={styles.dropdownEmpty}>—</span>
                                )}
                              </div>
                            )}

                            {/* Badge protégé pour les SUPER_ADMIN */}
                            {isSuperAdmin && (
                              <span className={styles.protectedBadge}>🔒 Protégé</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            {isSuperAdmin ? (
                              <span className={styles.protectedAction}>—</span>
                            ) : (
                              <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={() =>
                                  setConfirmTarget({
                                    type: 'user',
                                    userId: user.id,
                                    username: user.username,
                                    email: user.email,
                                    label: `Supprimer l'utilisateur "${user.username}" ? Son profil bancaire et tous ses comptes seront définitivement supprimés.`,
                                  })
                                }
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                title="Page précédente"
              >
                ‹
              </button>
              <span className={styles.pageInfo}>
                Page {safePage} / {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                title="Page suivante"
              >
                ›
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchUsers}
        />
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Confirmer l'action"
        message={confirmTarget?.label ?? ''}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
