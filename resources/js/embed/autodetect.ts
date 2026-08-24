// Auto-detect the logged-in player's ID from the HOST PAGE. Detection order:
//   1. window.KEMERBET_PLAYER_ID  (site injects it via a custom script)
//   2. Storage key (admin setting) — checks sessionStorage THEN localStorage.
//      Syntax: "key" for a plain value, or "key.field" / "key.a.b" to walk
//      into a JSON object (e.g. "player.id" reads
//      JSON.parse(sessionStorage.player).id).
//   3. document.querySelector(<admin CSS selector>) -> element text
// Returns a cleaned ID (3..32 alphanumeric/_/- chars) or null.

function cleanExact(v: unknown): string | null {
  // Whole-value match only — protects against grabbing a random word out of
  // a JSON blob when no field path was configured.
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).trim();
  return /^[A-Za-z0-9_-]{3,32}$/.test(s) ? s : null;
}

function cleanLoose(v: unknown): string | null {
  // Extract from surrounding text — for DOM elements like "ID: 28050120".
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const m = String(v).trim().match(/[A-Za-z0-9_-]{3,32}/);
  return m ? m[0] : null;
}

function fromStorage(spec: string): string | null {
  const dot = spec.indexOf('.');
  const key = dot === -1 ? spec : spec.slice(0, dot);
  const path = dot === -1 ? [] : spec.slice(dot + 1).split('.');

  for (const store of [sessionStorage, localStorage]) {
    let raw: string | null = null;
    try {
      raw = store.getItem(key);
    } catch {
      continue;
    }
    if (raw == null) continue;

    if (path.length > 0) {
      try {
        let v: unknown = JSON.parse(raw);
        for (const p of path) {
          if (v && typeof v === 'object') v = (v as Record<string, unknown>)[p];
          else { v = undefined; break; }
        }
        const got = cleanExact(v);
        if (got) return got;
      } catch { /* not JSON — fall through */ }
    } else {
      // Plain value, or JSON with a guessable id field.
      const direct = cleanExact(raw);
      if (direct) return direct;
      try {
        const obj = JSON.parse(raw) as Record<string, unknown>;
        for (const f of ['id', 'playerId', 'player_id', 'userId', 'user_id']) {
          const got = cleanExact(obj?.[f]);
          if (got) return got;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

export function detectPlayerId(opts: { storageKey?: string; domSelector?: string }): string | null {
  try {
    const w = window as unknown as { KEMERBET_PLAYER_ID?: unknown };
    const fromGlobal = cleanExact(w.KEMERBET_PLAYER_ID);
    if (fromGlobal) return fromGlobal;
  } catch { /* ignore */ }

  if (opts.storageKey) {
    const got = fromStorage(opts.storageKey.trim());
    if (got) return got;
  }

  if (opts.domSelector) {
    try {
      const el = document.querySelector(opts.domSelector);
      const got = cleanLoose(el?.textContent ?? (el as HTMLInputElement | null)?.value ?? null);
      if (got) return got;
    } catch { /* invalid selector — ignore */ }
  }

  return null;
}
