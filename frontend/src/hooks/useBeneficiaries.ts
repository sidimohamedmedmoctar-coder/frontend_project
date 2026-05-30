import { useState, useCallback, useEffect, useRef } from 'react';

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
 *
 * Stratégie de persistance (TP1 + TP5) :
 *   - On ne persiste QUE quand c'est l'utilisateur qui a modifié la liste
 *     (add/remove), jamais lors du chargement initial ou du changement de session.
 *   - isUserActionRef agit comme un flag interne (useRef → pas de re-render).
 */
export function useBeneficiaries(username: string) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  // useRef — vrai seulement quand la modification vient d'une action utilisateur
  // (pas du chargement initial). Empêche d'écraser localStorage lors de la
  // transition '' → 'alice' (TP5 — flag interne sans re-render)
  const isUserActionRef = useRef(false);

  // TP1 — Recharge les bénéficiaires quand l'utilisateur change
  useEffect(() => {
    isUserActionRef.current = false;               // reset : prochain write = chargement
    setBeneficiaries(loadBeneficiaries(username));
  }, [username]);

  // TP1 — Persiste dans localStorage uniquement après une action utilisateur
  useEffect(() => {
    if (!username || !isUserActionRef.current) return;
    localStorage.setItem(storageKey(username), JSON.stringify(beneficiaries));
  }, [beneficiaries, username]);

  /** Ajouter un bénéficiaire (useCallback — TP5) */
  const addBeneficiary = useCallback((b: Omit<Beneficiary, 'id'>): boolean => {
    isUserActionRef.current = true;    // marque : cette mise à jour doit être persistée
    setBeneficiaries((prev) => {
      if (prev.some((x) => x.rib === b.rib)) return prev;
      return [...prev, { ...b, id: Date.now() }];
    });
    return true;
  }, []);

  /** Supprimer un bénéficiaire (useCallback — TP5) */
  const removeBeneficiary = useCallback((id: number) => {
    isUserActionRef.current = true;    // marque : cette mise à jour doit être persistée
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { beneficiaries, addBeneficiary, removeBeneficiary };
}
