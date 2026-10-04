/**
 * Display-only formatting helpers.
 * Money arrives from the server as decimal strings and is NEVER calculated
 * on the client — these helpers only change how a server value is shown.
 */

const group = (intPart: string): string => {
  // Indian grouping: 12,34,567
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
};

export const toNum = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
};

export const isNegative = (v: string | number | null | undefined): boolean =>
  typeof v === 'string' ? v.trim().startsWith('-') : toNum(v) < 0;

/** "₹1,23,456.78" (always 2dp, grouped, sign preserved). */
export const inr = (v: string | number | null | undefined, opts?: { sign?: boolean }): string => {
  const n = toNum(v);
  const neg = n < 0;
  const [i, d] = Math.abs(n).toFixed(2).split('.');
  const body = `₹${group(i)}.${d}`;
  if (neg) return `-${body}`;
  return opts?.sign && n > 0 ? `+${body}` : body;
};

/** Compact for tight spaces: ₹1.2L, ₹3.4Cr, ₹12.5K. */
export const inrCompact = (v: string | number | null | undefined): string => {
  const n = toNum(v);
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)}K`;
  return `${s}₹${a.toFixed(0)}`;
};

export const pct = (v: string | number | null | undefined): string => {
  const s = String(v ?? '0').trim();
  return s.includes('%') ? s : `${toNum(v).toFixed(2)}%`;
};

export const shortDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const initials = (name?: string | null): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'U';
};

export const greeting = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
