import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDeviceId, fetchPair, syncLogin, displayOrder } from '../pairing';
import { renderCard } from '../card';
import type { PublicAgent } from '../types';

function agent(id: number, extra: Partial<PublicAgent> = {}): PublicAgent {
  return {
    id,
    telegram_username: `agent_${id}`,
    status: 'live',
    payment_methods: [{ slug: 'telebirr', display_name: 'TeleBirr' }],
    ...extra,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('device id', () => {
  it('is created once and then reused', () => {
    const first = getDeviceId();
    expect(first).toMatch(/^[A-Za-z0-9-]{16,64}$/);
    expect(getDeviceId()).toBe(first);
    expect(localStorage.getItem('kemerbet_device_id')).toBe(first);
  });

  it('replaces a corrupted stored value', () => {
    localStorage.setItem('kemerbet_device_id', 'bad id!');
    expect(getDeviceId()).toMatch(/^[A-Za-z0-9-]{16,64}$/);
  });
});

describe('fetchPair', () => {
  it('sends device id, player id and intent, and returns the agents', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true, agents: [agent(1), agent(2)], partial: false }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchPair('https://api.test', { playerId: 'P123', intent: 'withdrawal', amount: 500, bank: 'TeleBirr' });

    expect(res.enabled).toBe(true);
    expect(res.agents.map((a) => a.id)).toEqual([1, 2]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/public/pair');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ player_id: 'P123', intent: 'withdrawal', amount: 500, bank: 'TeleBirr' });
    expect(body.device_id).toBe(getDeviceId());
  });

  it('throws on a server error so the widget can show a retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    await expect(fetchPair('', { playerId: 'P123', intent: 'deposit' })).rejects.toThrow();
  });
});

describe('syncLogin', () => {
  it('syncs a device + player id only once', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: true, ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    syncLogin('', 'P123');
    await vi.waitFor(() => expect(localStorage.getItem('kemerbet_pair_synced')).not.toBeNull());
    syncLogin('', 'P123');
    syncLogin('', 'p123'); // same ID, different case

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('syncs again when a different account logs in on the device', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: true, ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    syncLogin('', 'P123');
    await vi.waitFor(() => expect(localStorage.getItem('kemerbet_pair_synced')).toContain('p123'));
    syncLogin('', 'P999');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

describe('displayOrder', () => {
  it('keeps agents already on screen in place and appends a replacement', () => {
    const shown = [agent(7), agent(3)];
    const refreshed = [agent(3), agent(9)]; // 7 went offline, 9 replaced it
    const ordered = displayOrder(refreshed, shown.map((a) => a.id));
    expect(ordered.map((a) => a.id)).toEqual([3, 9]);
  });

  it('returns every agent exactly once on a fresh screen', () => {
    const ordered = displayOrder([agent(1), agent(2), agent(3)], null);
    expect(ordered.map((a) => a.id).sort()).toEqual([1, 2, 3]);
  });
});

describe('agent card', () => {
  it('never shows the agent number', () => {
    const html = renderCard(agent(5, { display_number: 42 }), 'hi', 'en');
    expect(html).not.toContain('42');
    expect(html).toContain('>Agent<');
    expect(html).toContain('<svg');
  });
});
