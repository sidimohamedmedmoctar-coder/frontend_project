import { useState, useCallback, useEffect, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RequestType   = 'RELEVE' | 'VERSEMENT';
export type RequestStatus = 'EN_ATTENTE' | 'APPROUVÉE' | 'REFUSÉE';

export interface BankRequest {
  id:          number;
  username:    string;   // identifie le client (affiché pour l'admin)
  type:        RequestType;
  description: string;
  date:        string;
  status:      RequestStatus;
  amount?:     number;
  accountId?:  string;   // pour VERSEMENT : compte à approvisionner lors de l'approbation
}

// ── Clé localStorage partagée ─────────────────────────────────────────────────
// Toutes les demandes (tous utilisateurs) sont dans cette clé unique.
// L'admin lit depuis cette clé ; chaque utilisateur ne voit que les siennes.

export const SHARED_REQUESTS_KEY = 'bank_service_requests';

export function loadAllRequests(): BankRequest[] {
  try {
    const raw = localStorage.getItem(SHARED_REQUESTS_KEY);
    return raw ? (JSON.parse(raw) as BankRequest[]) : [];
  } catch {
    return [];
  }
}

function saveAllRequests(reqs: BankRequest[]) {
  localStorage.setItem(SHARED_REQUESTS_KEY, JSON.stringify(reqs));
}

/**
 * Supprime toutes les données localStorage liées à un username.
 * À appeler lors de la suppression d'un utilisateur ET lors de la création
 * d'un nouvel utilisateur avec le même username (évite l'héritage de l'historique).
 */
export function purgeUserLocalStorage(username: string) {
  try {
    // 1. Retirer les demandes de service de cet utilisateur (clé partagée)
    const allReqs      = loadAllRequests();
    const filteredReqs = allReqs.filter((r) => r.username !== username);
    saveAllRequests(filteredReqs);

    // 2. Retirer les tickets de support de cet utilisateur (clé partagée)
    try {
      const rawTickets = localStorage.getItem('bank_support_tickets');
      if (rawTickets) {
        const allTickets      = JSON.parse(rawTickets) as { username: string }[];
        const filteredTickets = allTickets.filter((t) => t.username !== username);
        localStorage.setItem('bank_support_tickets', JSON.stringify(filteredTickets));
        // Notifie les onglets ouverts
        window.dispatchEvent(new StorageEvent('storage', { key: 'bank_support_tickets' }));
      }
    } catch { /* silencieux */ }

    // 3. Supprimer les bénéficiaires enregistrés de cet utilisateur (clé propre)
    localStorage.removeItem(`bank_beneficiaries_${username}`);

    // 4. Supprimer les IDs de notifications fermées
    localStorage.removeItem(`dismissed_notifs_${username}`);
  } catch { /* silencieux */ }
}

// ── Hook utilisateur (TP5) ────────────────────────────────────────────────────

/**
 * useRequests(username) — demandes de l'utilisateur connecté.
 *
 * Écrit dans la clé partagée `bank_service_requests` (tag username sur chaque
 * entrée). L'admin peut ainsi lire TOUTES les demandes depuis la même clé.
 */
export function useRequests(username: string) {
  const [allRequests, setAllRequests] = useState<BankRequest[]>(loadAllRequests);

  // TP1 — persiste dans localStorage à chaque modification
  useEffect(() => {
    saveAllRequests(allRequests);
  }, [allRequests]);

  // TP1 — synchronisation cross-onglets (admin voit la demande en temps réel)
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === SHARED_REQUESTS_KEY && e.newValue) {
        try {
          setAllRequests(JSON.parse(e.newValue) as BankRequest[]);
        } catch { /* silencieux */ }
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // TP5 — useMemo : filtre les demandes de l'utilisateur connecté
  const requests = useMemo(
    () => allRequests.filter((r) => r.username === username),
    [allRequests, username],
  );

  /** Ajouter une demande — username injecté automatiquement (useCallback — TP5) */
  const addRequest = useCallback(
    (req: Omit<BankRequest, 'id' | 'date' | 'status' | 'username'>) => {
      setAllRequests((prev) => [
        ...prev,
        {
          ...req,
          username,
          id:     Date.now(),
          date:   new Date().toISOString(),
          status: 'EN_ATTENTE',
        },
      ]);
    },
    [username],
  );

  /** Annuler une demande en attente (useCallback — TP5) */
  const cancelRequest = useCallback((id: number) => {
    setAllRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { requests, loading: false, addRequest, cancelRequest };
}

// ── Hook admin ────────────────────────────────────────────────────────────────

/**
 * useAllRequests() — vue admin : toutes les demandes de tous les clients.
 *
 * Lit depuis la même clé partagée `bank_service_requests`.
 * Expose updateRequestStatus() pour approuver / refuser une demande.
 * Le changement de statut se reflète immédiatement dans la vue du client.
 */
export function useAllRequests() {
  const [requests, setRequests] = useState<BankRequest[]>(loadAllRequests);

  // TP1 — persiste dans localStorage à chaque modification
  useEffect(() => {
    saveAllRequests(requests);
  }, [requests]);

  // TP1 — synchronisation cross-onglets
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === SHARED_REQUESTS_KEY && e.newValue) {
        try {
          setRequests(JSON.parse(e.newValue) as BankRequest[]);
        } catch { /* silencieux */ }
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  /** Met à jour le statut d'une demande (useCallback — TP5) */
  const updateRequestStatus = useCallback(
    (id: number, status: RequestStatus) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    },
    [],
  );

  return { requests, updateRequestStatus };
}
