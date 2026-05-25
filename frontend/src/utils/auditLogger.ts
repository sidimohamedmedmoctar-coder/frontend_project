// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditLevel = 'INFO' | 'WARNING' | 'ERROR';

export interface AuditEntry {
  id:        number;
  timestamp: string;
  level:     AuditLevel;
  actor:     string;
  action:    string;
  details:   string;
}

// ── Storage key ───────────────────────────────────────────────────────────────

export const AUDIT_KEY  = 'bank_audit_logs';
const MAX_ENTRIES       = 500;   // rolling window

// ── Read ──────────────────────────────────────────────────────────────────────

export function loadAuditLogs(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
  try {
    const logs   = loadAuditLogs();
    const newLog: AuditEntry = {
      ...entry,
      id:        Date.now() + logs.length,   // collision-safe
      timestamp: new Date().toISOString(),
    };
    const updated = [...logs, newLog].slice(-MAX_ENTRIES);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(updated));
    // Notify other open tabs (e.g. superadmin watching the log live)
    window.dispatchEvent(new StorageEvent('storage', { key: AUDIT_KEY }));
  } catch { /* silencieux */ }
}

// ── Clear ─────────────────────────────────────────────────────────────────────

export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_KEY);
  window.dispatchEvent(new StorageEvent('storage', { key: AUDIT_KEY }));
}
