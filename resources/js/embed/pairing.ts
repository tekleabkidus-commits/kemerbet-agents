import type { PublicAgent } from './types';

// Pair rule client. The server decides WHICH agents a player gets (see
// AgentPairingService); this module only identifies the device, asks for the
// player's agents, and tells the server when a login is detected.

const DEVICE_KEY = 'kemerbet_device_id';
const SYNC_KEY = 'kemerbet_pair_synced';
const DEVICE_RE = /^[A-Za-z0-9-]{16,64}$/;

let memoryDeviceId: string | null = null;
let syncInFlight: string | null = null;

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  const bytes = new Uint8Array(16);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * This browser's device id: random, created once, kept in localStorage on the
 * betting site. If storage is blocked we still use one id for the page's
 * lifetime (the player ID then carries the memory on its own).
 */
export function getDeviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved && DEVICE_RE.test(saved)) return saved;
    const id = randomId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    if (!memoryDeviceId) memoryDeviceId = randomId();
    return memoryDeviceId;
  }
}

export interface PairResult {
  enabled: boolean;
  agents: PublicAgent[];
  partial: boolean;
}

/** Ask the server for this player's agents for a deposit or a withdrawal. */
export async function fetchPair(
  apiBase: string,
  req: { playerId: string; intent: 'deposit' | 'withdrawal'; amount?: number; bank?: string },
): Promise<PairResult> {
  const res = await fetch(`${apiBase}/api/public/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      device_id: getDeviceId(),
      player_id: req.playerId,
      intent: req.intent,
      amount: req.amount ?? null,
      bank: req.bank ? req.bank : null,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return {
    enabled: data?.enabled === true,
    agents: Array.isArray(data?.agents) ? (data.agents as PublicAgent[]) : [],
    partial: data?.partial === true,
  };
}

/**
 * Login detected: link this device to the player ID on the server (merges
 * both agent memories). Sent once per device + player ID.
 */
export function syncLogin(apiBase: string, playerId: string): void {
  const marker = `${getDeviceId()}|${playerId.trim().toLowerCase()}`;
  try {
    if (localStorage.getItem(SYNC_KEY) === marker) return;
  } catch {
    /* storage blocked — still sync, just not remembered */
  }
  if (syncInFlight === marker) return;
  syncInFlight = marker;

  fetch(`${apiBase}/api/public/pair/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ device_id: getDeviceId(), player_id: playerId.trim() }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && d.ok === true) {
        try {
          localStorage.setItem(SYNC_KEY, marker);
        } catch {
          /* ignore */
        }
      }
    })
    .catch(() => {})
    .finally(() => {
      syncInFlight = null;
    });
}

/**
 * Display order. On a fresh screen the agents are shuffled, so neither of the
 * player's agents always sits on top. On a background refresh the agents
 * already on screen keep their places and any replacement goes to the end, so
 * cards don't jump around under the player's finger.
 */
export function displayOrder(agents: PublicAgent[], previousIds: number[] | null): PublicAgent[] {
  if (!previousIds || previousIds.length === 0) {
    const a = [...agents];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pos = (id: number) => {
    const i = previousIds.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...agents].sort((a, b) => pos(a.id) - pos(b.id));
}
