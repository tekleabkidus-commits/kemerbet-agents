import type { AgentState, DisabledAgentState } from './types';

function baseUrl(token: string): string {
  return `/api/agent/${token}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...options,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API error ${status}`);
  }
}

export function fetchState(token: string): Promise<AgentState | DisabledAgentState> {
  return request(`${baseUrl(token)}/state`);
}

export function goOnline(token: string, durationMinutes: number): Promise<AgentState> {
  return request(`${baseUrl(token)}/go-online`, {
    method: 'POST',
    body: JSON.stringify({ duration_minutes: durationMinutes }),
  });
}

export function extend(token: string, durationMinutes: number): Promise<AgentState> {
  return request(`${baseUrl(token)}/extend`, {
    method: 'POST',
    body: JSON.stringify({ duration_minutes: durationMinutes }),
  });
}

export function goOffline(token: string): Promise<AgentState> {
  return request(`${baseUrl(token)}/go-offline`, {
    method: 'POST',
  });
}
