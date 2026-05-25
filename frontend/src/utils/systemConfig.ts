// ── Types ─────────────────────────────────────────────────────────────────────

export interface SystemConfig {
  overdraftLimit:   number;   // découvert autorisé sur les comptes courants (MAD)
  transferLimit:    number;   // plafond journalier des virements (MAD)
  transferFee:      number;   // frais de virement en % du montant
  creditMinAmount:  number;   // montant minimum d'un versement (MAD)
  creditMaxAmount:  number;   // montant maximum d'un versement (MAD)
}

// ── Storage key ───────────────────────────────────────────────────────────────

export const CONFIG_KEY = 'bank_system_config';

export const DEFAULT_CONFIG: SystemConfig = {
  overdraftLimit:   5000,
  transferLimit:    100000,
  transferFee:      0.5,
  creditMinAmount:  10000,
  creditMaxAmount:  1000000,
};

// ── Read ──────────────────────────────────────────────────────────────────────

export function loadSystemConfig(): SystemConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    // Merge with defaults so missing keys stay valid
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<SystemConfig>) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveSystemConfig(config: SystemConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  // Notify other open tabs so they pick up the new limits immediately
  window.dispatchEvent(new StorageEvent('storage', { key: CONFIG_KEY }));
}
