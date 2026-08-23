export interface AgentPaymentMethod {
  slug: string;
  display_name: string;
}

export interface PublicAgent {
  id: number;
  display_number: number;
  telegram_username: string;
  status: 'live' | 'recently_offline';
  is_pinned?: boolean;
  last_seen_at?: string; // ISO 8601, only for recently_offline
  payment_methods: AgentPaymentMethod[];
  // Withdrawal capability — present on every agent in the payload.
  accepts_withdrawals?: boolean;
  withdrawal_max?: number | null;
  withdrawal_id?: string | null;
}

// Compact entry for every active agent, used to resolve a player's stored
// "recent agents" even when the agent isn't in the current live/offline list.
export interface AgentDirectoryEntry {
  id: number;
  display_number: number;
  telegram_username: string;
  online: boolean;
  accepts_withdrawals: boolean;
  withdrawal_max: number | null;
  has_withdrawal_id: boolean;
}

export interface PublicAgentsResponse {
  cached_at: string;
  live_count: number;
  agents: PublicAgent[];
  directory: AgentDirectoryEntry[];
  settings: {
    chat_prefilled_message: string;
    show_offline_agents: boolean;
    shuffle_live_agents: boolean;
    onboarding_video_url: string;
    // --- Withdrawal ---
    withdrawals_enabled: boolean;
    withdrawal_min: number;
    withdrawal_quick_amounts: number[];
    withdrawal_redirect_path: string; // relative, e.g. /sport/popup/withdrawal
    withdrawal_howto_video_url: string;
    withdrawal_no_match_behavior: 'closest' | 'empty';
    withdrawal_bank_options: string[];
    withdrawal_require_payout_details: boolean;
    withdrawal_message_with_amount: string;
    withdrawal_message_no_amount: string;
    recents_enabled: boolean;
    recents_count: number;
  };
}

export type Lang = 'am' | 'en';
