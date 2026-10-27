export interface AgentPaymentMethod {
  slug: string;
  display_name: string;
}

export interface PublicAgent {
  id: number;
  // Not sent by the pair endpoint, and never displayed to players.
  display_number?: number;
  telegram_username: string;
  status: 'live' | 'recently_offline';
  is_pinned?: boolean;
  last_seen_at?: string; // ISO 8601, only for recently_offline
  payment_methods: AgentPaymentMethod[];
  // Withdrawal capability — present on every agent in the payload.
  accepts_withdrawals?: boolean;
  withdrawal_max?: number | null;
  withdrawal_id?: string | null;
  withdrawal_methods?: AgentPaymentMethod[];
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

export interface PlayerNotice {
  id: number;
  title: string | null;
  body: string;
  priority: 'urgent' | 'info';
  video_url: string | null;
}

export interface PublicAgentsResponse {
  cached_at: string;
  live_count: number;
  // True when at least one agent is online (pair mode shows no count).
  agents_available?: boolean;
  agents: PublicAgent[];
  directory: AgentDirectoryEntry[];
  notices?: PlayerNotice[];
  settings: {
    chat_prefilled_message: string;
    show_offline_agents: boolean;
    shuffle_live_agents: boolean;
    server_ranked_agents?: boolean;
    onboarding_video_url: string;
    // --- Withdrawal ---
    withdrawals_enabled: boolean;
    withdrawal_min: number;
    withdrawal_quick_amounts: number[];
    withdrawal_redirect_path: string; // relative, e.g. /sport/popup/withdrawal
    withdrawal_howto_video_url: string;
    deposit_howto_video_url?: string;
    withdrawal_no_match_behavior: 'closest' | 'empty';
    withdrawal_bank_options: string[];
    withdrawal_require_payout_details: boolean;
    withdrawal_message_with_amount: string;
    withdrawal_message_no_amount: string;
    deposit_quick_amounts?: number[];
    deposit_message?: string;
    player_id_storage_key?: string;
    player_id_dom_selector?: string;
    recents_enabled: boolean;
    recents_count: number;
    // Pair rule: each player only sees their own agents (fetched from
    // /api/public/pair), and the player ID must be auto-detected.
    pair_mode_enabled?: boolean;
    pair_size?: number;
  };
}

export type Lang = 'am' | 'en';
