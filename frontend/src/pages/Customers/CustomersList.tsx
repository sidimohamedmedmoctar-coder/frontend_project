import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCustomers,
  searchCustomers,
  deleteCustomer,
  saveCustomer,
} from '@/api/customers.api';
import { getUsers, deleteUser } from '@/api/users.api';
import type { Customer } from '@/types';
import Spinner from '@/components/Spinner/Spinner';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import styles from './CustomersList.module.css';

const PAGE_SIZE = 20;

export default function CustomersList() {
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [customers, setCustomers]               = useState<Customer[]>([]);
  const [adminEmails, setAdminEmails]           = useState<Set<string>>(new Set());
  const [keyword, setKeyword]                   = useState('');
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<number | null>(null);
  const [clientPage, setClientPage]             = useState(0);
  const [syncing, setSyncing]                   = useState(false);
  const [cleaning, setCleaning]                 = useState(false);
  const [missingCount, setMissingCount]         = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Charge la liste des emails admin/superadmin pour les exclure de l'affichage
  const loadAdminEmails = useCallback(async () => {
    try {
      const users = await getUsers();
      const emails = new Set(
        users
          .filter((u) => u.email && (u.roles.includes('ADMIN') || u.roles.includes('SUPER_ADMIN')))
          .map((u) => u.email!.toLowerCase()),
      );
      setAdminEmails(emails);
    } catch {
      // silencieux
    }
  }, []);

  const fetchCustomers = useCallback(async (kw: string) => {
    setLoading(true);
    setError('');
    setClientPage(0);
    try {
      const data = kw.trim() ? await searchCustomers(kw) : await getCustomers();
      setCustomers(data);
    } catch {
      setError('Impossible de charger les clients.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Détecte les AppUsers sans profil Customer ─────────────────────────────
  // Un AppUser est "client" si son rôle n'est ni ADMIN ni SUPER_ADMIN.
  // Si son email ne correspond à aucun Customer existant → profil manquant.
  const checkMissingProfiles = useCallback(async (existingCustomers: Customer[]) => {
    try {
      const users = await getUsers();
      const customerEmails = new Set(existingCustomers.map((c) => c.email.toLowerCase()));
      const clientUsers = users.filter((u) =>
        u.email &&
        !u.roles.includes('ADMIN') &&
        !u.roles.includes('SUPER_ADMIN') &&
        !customerEmails.has(u.email.toLowerCase()),
      );
      setMissingCount(clientUsers.length);
    } catch {
      // silencieux — fonctionnalité optionnelle
    }
  }, []);

  useEffect(() => {
    fetchCustomers('').then(() => {});
  }, [fetchCustomers]);

  // Charge les emails admin/superadmin au montage
  useEffect(() => {
    loadAdminEmails();
  }, [loadAdminEmails]);

  // Recheck missing count quand la liste change
  useEffect(() => {
    checkMissingProfiles(customers);
  }, [customers, checkMissingProfiles]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setKeyword(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCustomers(val), 300);
  }

  async function handleConfirmDelete() {
    if (customerToDelete === null) return;
    try {
      // Récupère l'email du client avant de le supprimer
      const customer = customers.find((c) => c.id === customerToDelete);

      // 1. Supprime le profil bancaire (Customer)
      await deleteCustomer(customerToDelete);
      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete));

      // 2. Supprime le compte de connexion (AppUser) associé au même email
      //    Sans ça, le client peut toujours se connecter malgré la suppression.
      if (customer?.email) {
        try {
          const users = await getUsers();
          const appUser = users.find(
            (u) => u.email?.toLowerCase() === customer.email.toLowerCase(),
          );
          if (appUser?.id) {
            await deleteUser(appUser.id);
          }
        } catch {
          // Silencieux — si le AppUser n'existe pas, ce n'est pas bloquant
        }
      }

      pushToast({ type: 'success', message: 'Client et compte supprimés avec succès.' });
    } catch {
      pushToast({ type: 'error', message: 'Erreur lors de la suppression.' });
    } finally {
      setCustomerToDelete(null);
    }
  }

  // ── Synchroniser : crée les profils Customer manquants ───────────────────
  async function handleSync() {
    setSyncing(true);
    try {
      const [users, existingCustomers] = await Promise.all([getUsers(), getCustomers()]);
      const customerEmails = new Set(existingCustomers.map((c) => c.email.toLowerCase()));

      const toCreate = users.filter((u) =>
        u.email &&
        !u.roles.includes('ADMIN') &&
        !u.roles.includes('SUPER_ADMIN') &&
        !customerEmails.has(u.email.toLowerCase()),
      );

      if (toCreate.length === 0) {
        pushToast({ type: 'success', message: 'Tous les clients ont déjà un profil bancaire.' });
        return;
      }

      // Crée un Customer pour chaque AppUser client sans profil
      await Promise.all(
        toCreate.map((u) =>
          saveCustomer({ name: u.username, email: u.email! }),
        ),
      );

      pushToast({
        type: 'success',
        message: `${toCreate.length} profil${toCreate.length > 1 ? 's' : ''} client créé${toCreate.length > 1 ? 's' : ''} avec succès.`,
      });

      // Rafraîchir la liste
      await fetchCustomers(keyword);
    } catch {
      pushToast({ type: 'error', message: 'Erreur lors de la synchronisation.' });
    } finally {
      setSyncing(false);
    }
  }

  // ── Détection des doublons (même email, IDs différents) ─────────────────
  // Pour chaque groupe d'emails, on garde le plus récent (ID le plus élevé) ;
  // tous les autres sont des doublons à supprimer.
  const duplicateIds = (() => {
    const grouped = new Map<string, Customer[]>();
    for (const c of customers) {
      const key = c.email.toLowerCase();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(c);
    }
    const ids = new Set<number>();
    grouped.forEach((group) => {
      if (group.length > 1) {
        const sorted = [...group].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        sorted.slice(1).forEach((c) => { if (c.id != null) ids.add(c.id); });
      }
    });
    return ids;
  })();

  // ── Nettoyer les doublons — garde uniquement le plus récent par email ─────
  async function handleCleanDuplicates() {
    if (duplicateIds.size === 0) return;
    setCleaning(true);
    try {
      await Promise.all([...duplicateIds].map((id) => deleteCustomer(id)));
      pushToast({
        type: 'success',
        message: `${duplicateIds.size} doublon${duplicateIds.size > 1 ? 's' : ''} supprimé${duplicateIds.size > 1 ? 's' : ''}.`,
      });
      await fetchCustomers(keyword);
    } catch {
      pushToast({ type: 'error', message: 'Erreur lors du nettoyage des doublons.' });
    } finally {
      setCleaning(false);
    }
  }

  // ── Exclure les comptes admin/superadmin de la vue client ────────────────
  const visibleCustomers = customers.filter(
    (c) => !adminEmails.has(c.email.toLowerCase()),
  );

  // ── Pagination côté client ────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(visibleCustomers.length / PAGE_SIZE));
  const paginated  = visibleCustomers.slice(clientPage * PAGE_SIZE, (clientPage + 1) * PAGE_SIZE);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Clients</h1>

        {/* Bouton synchronisation — visible uniquement s'il y a des profils manquants */}
        {missingCount > 0 && (
          <button
            className={styles.btnSync}
            onClick={handleSync}
            disabled={syncing}
            type="button"
          >
            {syncing ? '⏳ Synchronisation…' : `🔄 Créer ${missingCount} profil${missingCount > 1 ? 's' : ''} manquant${missingCount > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* ── Bandeau doublons ── */}
      {duplicateIds.size > 0 && (
        <div className={styles.duplicateBanner}>
          <span>
            ⚠️ <strong>{duplicateIds.size} profil{duplicateIds.size > 1 ? 's' : ''} en doublon</strong> détecté{duplicateIds.size > 1 ? 's' : ''} — même email, enregistrements multiples.
          </span>
          <button
            type="button"
            className={styles.btnClean}
            onClick={handleCleanDuplicates}
            disabled={cleaning}
          >
            {cleaning ? '⏳ Nettoyage…' : '🗑 Supprimer les doublons'}
          </button>
        </div>
      )}

      <div className={styles.searchBar}>
        <input
          type="search"
          placeholder="Rechercher par nom ou email…"
          value={keyword}
          onChange={handleSearch}
          className={styles.searchInput}
        />
        {visibleCustomers.length > 0 && (
          <span className={styles.count}>{visibleCustomers.length} résultat{visibleCustomers.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {loading && <div className={styles.centered}><Spinner size={36} /></div>}
      {error   && <p className={styles.errorMsg}>{error}</p>}

      {!loading && !error && visibleCustomers.length === 0 && (
        <p className={styles.emptyMsg}>Aucun client trouvé.</p>
      )}

      {!loading && visibleCustomers.length > 0 && (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c.id} className={duplicateIds.has(c.id!) ? styles.rowDuplicate : ''}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>
                      {c.email}
                      {duplicateIds.has(c.id!) && (
                        <span className={styles.duplicateBadge}>doublon</span>
                      )}
                    </td>
                    <td className={styles.actions}>
                      <button className={styles.btnOutline} onClick={() => navigate(`/admin/customers/${c.id}/accounts`)} type="button">Comptes</button>
                      <button className={styles.btnDanger}  onClick={() => setCustomerToDelete(c.id!)}                    type="button">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setClientPage((p) => Math.max(0, p - 1))}
                disabled={clientPage === 0}
                type="button"
              >‹</button>
              <span className={styles.pageInfo}>Page {clientPage + 1} / {totalPages}</span>
              <button
                className={styles.pageBtn}
                onClick={() => setClientPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={clientPage >= totalPages - 1}
                type="button"
              >›</button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={customerToDelete !== null}
        title="Supprimer le client"
        message="Cette action est irréversible. Voulez-vous vraiment supprimer ce client ?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}
