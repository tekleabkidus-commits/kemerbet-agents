// Per-player saved Player IDs (the betting-site account IDs), kept in
// localStorage on the device. Never sent to the server.
//
// Each ID remembers when it was last used in each context (deposit /
// withdrawal). Suggestions for a context prefer that context's own history,
// newest first, topping up from the other context only while fewer than 4 of
// its own exist — a full set of 4 own-context IDs is never displaced.

const KEY = 'kemerbet_player_ids';
const MAX_SHOW = 4;
const MAX_STORE = 12;

export type PlayerIdCtx = 'deposit' | 'withdrawal';

interface StoredId {
  id: string;
  depTs?: number;
  wdTs?: number;
}

function read(): StoredId[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is StoredId => e && typeof e.id === 'string' && e.id !== '');
  } catch {
    return [];
  }
}

function write(list: StoredId[]): void {
  try {
    const sorted = [...list].sort(
      (a, z) => Math.max(z.depTs ?? 0, z.wdTs ?? 0) - Math.max(a.depTs ?? 0, a.wdTs ?? 0),
    );
    localStorage.setItem(KEY, JSON.stringify(sorted.slice(0, MAX_STORE)));
  } catch {
    // storage unavailable — suggestions silently degrade
  }
}

export function savePlayerId(id: string, ctx: PlayerIdCtx): void {
  const clean = id.trim();
  if (!clean) return;
  const list = read();
  const existing = list.find((e) => e.id === clean);
  const entry = existing ?? { id: clean };
  if (ctx === 'deposit') entry.depTs = Date.now();
  else entry.wdTs = Date.now();
  if (!existing) list.unshift(entry);
  write(list);
}

export function deletePlayerId(id: string): void {
  write(read().filter((e) => e.id !== id));
}

/** Up to 4 suggestions: own-context history first, topped up from the other. */
export function suggestPlayerIds(ctx: PlayerIdCtx): string[] {
  const list = read();
  const ownTs = (e: StoredId) => (ctx === 'deposit' ? e.depTs : e.wdTs) ?? 0;
  const otherTs = (e: StoredId) => (ctx === 'deposit' ? e.wdTs : e.depTs) ?? 0;

  const own = list.filter((e) => ownTs(e) > 0).sort((a, z) => ownTs(z) - ownTs(a));
  const result = own.slice(0, MAX_SHOW).map((e) => e.id);

  if (result.length < MAX_SHOW) {
    const fill = list
      .filter((e) => ownTs(e) === 0 && otherTs(e) > 0)
      .sort((a, z) => otherTs(z) - otherTs(a));
    for (const e of fill) {
      if (result.length >= MAX_SHOW) break;
      if (!result.includes(e.id)) result.push(e.id);
    }
  }
  return result;
}
