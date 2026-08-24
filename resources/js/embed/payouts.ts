import type { PayoutDetails } from './withdrawal';

// Per-player saved payout accounts, kept in localStorage on the player's own
// device. Never sent to the server. Used to autocomplete name + account when
// the player picks a bank they've used before.

const KEY = 'kemerbet_payout_accounts';
const MAX = 4;

interface StoredPayout extends PayoutDetails {
  ts: number;
}

function read(): StoredPayout[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is StoredPayout =>
        e && typeof e.name === 'string' && typeof e.bank === 'string' && typeof e.account === 'string',
    );
  } catch {
    return [];
  }
}

function write(list: StoredPayout[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // storage unavailable — suggestions silently degrade to nothing
  }
}

/** Save (or refresh) a payout account. One entry per bank+account pair. */
export function savePayout(p: PayoutDetails): void {
  const name = p.name.trim();
  const bank = p.bank.trim();
  const account = p.account.trim();
  const playerId = (p.playerId ?? '').trim();
  if (!name || !bank || !account) return;

  const list = read().filter(
    (e) => !(e.bank === bank && e.account === account),
  );
  list.unshift({ name, bank, account, playerId, ts: Date.now() });
  write(list);
}

/** Remove a saved account by bank+account pair. */
export function deletePayout(bank: string, account: string): void {
  const b = bank.trim();
  const a = account.trim();
  write(read().filter((e) => !(e.bank === b && e.account === a)));
}

/**
 * Most recent saved account for a given bank, if any. Used to prefill the
 * account + name fields when the player selects that bank.
 */
export function suggestForBank(bank: string): PayoutDetails | null {
  const b = bank.trim();
  if (!b) return null;
  const match = read()
    .filter((e) => e.bank === b)
    .sort((a, z) => z.ts - a.ts)[0];
  return match
    ? { name: match.name, bank: match.bank, account: match.account, playerId: match.playerId }
    : null;
}

/** All saved accounts for a bank, newest first (for a future dropdown of options). */
export function allForBank(bank: string): PayoutDetails[] {
  const b = bank.trim();
  return read()
    .filter((e) => e.bank === b)
    .sort((a, z) => z.ts - a.ts)
    .map((e) => ({ name: e.name, bank: e.bank, account: e.account, playerId: e.playerId }));
}

/** Most recent saved accounts overall, newest first, capped at `n`. */
export function recentSaved(n: number): PayoutDetails[] {
  return read()
    .sort((a, z) => z.ts - a.ts)
    .slice(0, n)
    .map((e) => ({ name: e.name, bank: e.bank, account: e.account, playerId: e.playerId }));
}
