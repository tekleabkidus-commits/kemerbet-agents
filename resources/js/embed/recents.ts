import type { AgentDirectoryEntry } from './types';

// Per-player list of recently contacted agents, kept in localStorage on the
// player's own device. Never sent to the server; nobody else sees it.

const RECENTS_KEY = 'kemerbet_recent_agents';
const MAX_STORED = 20; // store more than we show, so count changes don't lose data

export interface RecentEntry {
  agent_id: number;
  intent: 'deposit' | 'withdrawal' | 'contact';
  ts: number; // epoch ms of last contact
}

export interface ResolvedRecent {
  entry: RecentEntry;
  agent: AgentDirectoryEntry;
}

function read(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentEntry =>
        e && typeof e.agent_id === 'number' && typeof e.ts === 'number',
    );
  } catch {
    return [];
  }
}

function write(list: RecentEntry[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_STORED)));
  } catch {
    // localStorage may be unavailable — recents silently degrade to nothing
  }
}

/**
 * Record a contact with an agent. Most-recent-first; one entry per agent
 * (a newer contact updates that agent's timestamp and intent, and moves it
 * to the front) so the list reflects who the player last dealt with.
 */
export function recordRecent(
  agentId: number,
  intent: RecentEntry['intent'],
): void {
  const list = read().filter((e) => e.agent_id !== agentId);
  list.unshift({ agent_id: agentId, intent, ts: Date.now() });
  write(list);
}

/**
 * Resolve stored recents against the current directory, newest first, capped
 * at `count`. Agents no longer in the directory (deleted/disabled) are dropped
 * silently. Returns the directory entry so the caller has live online status
 * and withdrawal capability.
 */
export function resolveRecents(
  directory: AgentDirectoryEntry[],
  count: number,
): ResolvedRecent[] {
  const byId = new Map(directory.map((d) => [d.id, d]));
  const resolved: ResolvedRecent[] = [];

  for (const entry of read().sort((a, b) => b.ts - a.ts)) {
    const agent = byId.get(entry.agent_id);
    if (!agent) continue; // dropped: agent no longer active
    resolved.push({ entry, agent });
    if (resolved.length >= count) break;
  }

  return resolved;
}
