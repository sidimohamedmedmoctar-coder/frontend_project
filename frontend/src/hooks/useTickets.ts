import { useState, useCallback, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TicketStatus = 'OUVERT' | 'EN_COURS' | 'RÉSOLU';

export interface SupportTicket {
  id:          number;
  username:    string;       // identifiant du client
  clientName:  string;       // nom complet affiché pour l'admin
  subject:     string;
  message:     string;
  date:        string;       // ISO
  status:      TicketStatus;
  response?:   string;       // réponse de l'admin
}

// ── Clé localStorage partagée ─────────────────────────────────────────────────

export const TICKETS_KEY = 'bank_support_tickets';

function loadTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(TICKETS_KEY);
    return raw ? (JSON.parse(raw) as SupportTicket[]) : [];
  } catch {
    return [];
  }
}

function persist(tickets: SupportTicket[]) {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  // Notifie les autres onglets
  window.dispatchEvent(new StorageEvent('storage', { key: TICKETS_KEY }));
}

// ── Hook côté client ──────────────────────────────────────────────────────────

export function useTickets(username: string) {
  const [all, setAll] = useState<SupportTicket[]>(loadTickets);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === TICKETS_KEY) setAll(loadTickets());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Seulement les tickets du client connecté
  const tickets = all.filter((t) => t.username === username);

  const addTicket = useCallback(
    (data: { subject: string; message: string; clientName: string }) => {
      const fresh    = loadTickets();
      const newEntry: SupportTicket = {
        id:         Date.now(),
        username,
        clientName: data.clientName,
        subject:    data.subject.trim(),
        message:    data.message.trim(),
        date:       new Date().toISOString(),
        status:     'OUVERT',
      };
      const next = [...fresh, newEntry];
      persist(next);
      setAll(next);
    },
    [username],
  );

  return { tickets, addTicket };
}

// ── Hook côté admin ───────────────────────────────────────────────────────────

export function useAllTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>(loadTickets);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === TICKETS_KEY) setTickets(loadTickets());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const respondToTicket = useCallback((id: number, response: string) => {
    const next = loadTickets().map((t) =>
      t.id === id ? { ...t, response: response.trim(), status: 'RÉSOLU' as TicketStatus } : t,
    );
    persist(next);
    setTickets(next);
  }, []);

  const markInProgress = useCallback((id: number) => {
    const next = loadTickets().map((t) =>
      t.id === id ? { ...t, status: 'EN_COURS' as TicketStatus } : t,
    );
    persist(next);
    setTickets(next);
  }, []);

  return { tickets, respondToTicket, markInProgress };
}
