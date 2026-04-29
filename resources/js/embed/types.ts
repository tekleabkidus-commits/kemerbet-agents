export interface AgentPaymentMethod {
  slug: string;
  display_name: string;
}

export interface PublicAgent {
  id: number;
  display_number: number;
  telegram_username: string;
  status: 'live' | 'recently_offline';
  last_seen_at?: string; // ISO 8601, only for recently_offline
  payment_methods: AgentPaymentMethod[];
}

export interface PublicAgentsResponse {
  cached_at: string;
  live_count: number;
  agents: PublicAgent[];
  settings: {
    chat_prefilled_message: string;
    show_offline_agents: boolean;
    shuffle_live_agents: boolean;
  };
}

export type Lang = 'am' | 'en';
