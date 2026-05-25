import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { createUser } from '@/api/users.api';
import { saveCustomer } from '@/api/customers.api';
import { createCurrentAccount } from '@/api/accounts.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RegistrationStatus = 'EN_ATTENTE' | 'APPROUVÉE' | 'REFUSÉE';

export interface PendingRegistration {
  id:       number;
  fullName: string;   // ← nom complet → crée le Customer lors de l'approbation
  username: string;
  email:    string;
  password: string;
  date:     string;
  status:   RegistrationStatus;
}

interface RegistrationContextValue {
  pendingRegistrations: PendingRegistration[];
  addRegistration:      (req: Omit<PendingRegistration, 'id' | 'date' | 'status'>) => void;
  approveRegistration:  (id: number) => Promise<void>;
  rejectRegistration:   (id: number) => void;
}

// ── localStorage key ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'bank_registrations';

// ── Seed data (uniquement si localStorage vide) ───────────────────────────────

const SEED: PendingRegistration[] = [
  {
    id:       1,
    fullName: 'Mehdi Alaoui',
    username: 'mehdi.alaoui',
    email:    'mehdi.alaoui@gmail.com',
    password: 'Client@123',
    date:     '2025-05-22T10:30:00',
    status:   'EN_ATTENTE',
  },
  {
    id:       2,
    fullName: 'Leila Ben Haddou',
    username: 'leila.benhaddou',
    email:    'leila.bh@outlook.com',
    password: 'Client@456',
    date:     '2025-05-23T08:00:00',
    status:   'EN_ATTENTE',
  },
];

// ── Lecture initiale ──────────────────────────────────────────────────────────

function loadFromStorage(): PendingRegistration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PendingRegistration[];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return SEED;
}

// ── Context ───────────────────────────────────────────────────────────────────

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>(loadFromStorage);

  // TP1 — useEffect : persiste dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
  }, [registrations]);

  // TP1 — Synchronisation cross-onglets :
  // Le navigateur déclenche "storage" uniquement dans les AUTRES onglets,
  // jamais dans celui qui a écrit. Ainsi, quand un visiteur soumet depuis
  // l'onglet /register, l'onglet admin se met à jour automatiquement.
  useEffect(() => {
    function handleStorageEvent(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setRegistrations(JSON.parse(e.newValue) as PendingRegistration[]);
        } catch {
          // silencieux — données corrompues ignorées
        }
      }
    }
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  /** Visiteur soumet sa demande depuis /register */
  const addRegistration = useCallback(
    (req: Omit<PendingRegistration, 'id' | 'date' | 'status'>) => {
      setRegistrations((prev) => [
        ...prev,
        { ...req, id: Date.now(), date: new Date().toISOString(), status: 'EN_ATTENTE' },
      ]);
    },
    [],
  );

  /**
   * Admin approuve la demande :
   *   1. POST /admin/users        → crée le compte de connexion (AppUser)
   *   2. POST /customers          → crée le profil bancaire (Customer)
   *   3. POST /accounts/current   → ouvre un compte courant (solde 0, découvert 1 000)
   *                                  ↑ le client voit ses comptes dès la 1ère connexion
   */
  const approveRegistration = useCallback(async (id: number) => {
    const reg = registrations.find((r) => r.id === id);
    if (!reg) return;

    // Étape 1 — compte de connexion
    await createUser({
      username: reg.username,
      email:    reg.email,
      password: reg.password,
    });

    // Étape 2 — profil bancaire (apparaît dans GET /customers)
    const newCustomer = await saveCustomer({
      name:  reg.fullName,
      email: reg.email,
    });

    // Étape 3 — compte courant par défaut (solde initial 0 MAD)
    if (newCustomer?.id) {
      await createCurrentAccount({
        customerId:     newCustomer.id,
        initialBalance: 0,
        overDraft:      1000,
      });
    }

    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'APPROUVÉE' } : r)),
    );
  }, [registrations]);

  /** Admin rejette la demande */
  const rejectRegistration = useCallback((id: number) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'REFUSÉE' } : r)),
    );
  }, []);

  const value: RegistrationContextValue = {
    pendingRegistrations: registrations,
    addRegistration,
    approveRegistration,
    rejectRegistration,
  };

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
}

// ── Custom hook (TP2) ─────────────────────────────────────────────────────────

export function useRegistrations(): RegistrationContextValue {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistrations must be used inside RegistrationProvider');
  return ctx;
}
