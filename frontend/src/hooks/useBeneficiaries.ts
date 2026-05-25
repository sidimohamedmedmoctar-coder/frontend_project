import { useState, useCallback, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Beneficiary {
  id:   number;
  name: string;
  rib:  string;   // RIB du compte bénéficiaire (24 chiffres)
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function storageKey(username: string) {
  return `bank_beneficiaries_${username}`;
}

function loadBeneficiaries(username: string): Beneficiary[] {
  if (!username) return [];
  try {
    const raw = localStorage.getItem(storageKey(username));
    return raw ? (JSON.parse(raw) as Beneficiary[]) : [];
  } catch {
    return [];
  }
}

// ── Custom hook (TP5) ─────────────────────────────────────────────────────────

/**
 * useBeneficiaries — gestion des bénéficiaires par utilisateur.
 *
 * Les données sont stockées dans le localStorage sous la clé
 * `bank_beneficiaries_<username>`, donc chaque client a sa propre
 * liste et un nouveau compte commence toujours vide.
 */
export function useBeneficiaries(username: string) {
  // TP2 — useState initialisé depuis localStorage (spécifique au user)
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(
    () => loadBeneficiaries(username),
  );

  // TP1 — useEffect : persiste dans localStorage à chaque modification
  useEffect(() => {
    if (!username) return;
    localStorage.setItem(storageKey(username), JSON.stringify(beneficiaries));
  }, [beneficiaries, username]);

  // Recharge si l'utilisateur change (changement de session)
  useEffect(() => {
    setBeneficiaries(loadBeneficiaries(username));
  }, [username]);

  /** Ajouter un bénéficiaire (useCallback — TP5) */
  const addBeneficiary = useCallback((b: Omit<Beneficiary, 'id'>): boolean => {
    // Évite les doublons de RIB
    setBeneficiaries((prev) => {
      if (prev.some((x) => x.rib === b.rib)) return prev;
      return [...prev, { ...b, id: Date.now() }];
    });
    return true;
  }, []);

  /** Supprimer un bénéficiaire (useCallback — TP5) */
  const removeBeneficiary = useCallback((id: number) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { beneficiaries, addBeneficiary, removeBeneficiary };
}
