/** Matches the JSON shape returned by GET /api/agent/{token}/state */

export interface AgentInfo {
  display_number: number;
  telegram_username: string;
  is_disabled: boolean;
}

export interface AgentStatus {
  is_live: boolean;
  live_until: string | null; // ISO 8601
  total_duration_minutes: number | null;
}

export interface AgentMetrics {
  clicks_today: number | null;
  clicks_yesterday: number | null;
  live_time_today_minutes: number;
  sessions_today: number;
}

export interface ActivityEvent {
  event_type: 'went_online' | 'went_offline' | 'extended';
  description: string;
  created_at: string; // ISO 8601
}

export interface AgentState {
  agent: AgentInfo;
  status: AgentStatus;
  metrics: AgentMetrics;
  recent_activity: ActivityEvent[];
  available_durations: number[];
  recommended_duration: number | null;
  token_suffix: string;
}

/** Reduced payload returned when agent is disabled */
export interface DisabledAgentState {
  agent: AgentInfo & { is_disabled: true };
}

export type PageState = 'loading' | 'invalid' | 'disabled' | 'offline' | 'live';

export interface ToastState {
  message: string;
  type: 'success' | 'warning';
  icon: string;
}
