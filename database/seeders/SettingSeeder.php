<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $settings = [
                'prefill_message' => 'Hi Kemerbet agent, I want to deposit',
                'agent_hide_after_hours' => 12,
                'public_refresh_interval_seconds' => 60,
                'show_offline_agents' => true,
                'warn_on_offline_click' => true,
                'shuffle_live_agents' => true,
                'onboarding_video_url' => '',

                // --- Withdrawal system ---
                // LAUNCH DARK: withdrawals ship disabled. The widget behaves as
                // the classic deposit-only embed until an admin flips this on in
                // Settings -> Withdrawals (after configuring agent IDs, banks,
                // and templates).
                'withdrawals_enabled' => false,
                'withdrawal_min' => 200,
                'withdrawal_max_default' => 10000,
                'withdrawal_quick_amounts' => [200, 500, 1000, 3000, 5000, 10000, 25000, 50000, 100000],
                // Relative path only — the widget prepends the origin of the
                // domain it is embedded on, so this works across all domains.
                'withdrawal_redirect_path' => '/sport/popup/withdrawal',
                'withdrawal_howto_video_url' => '',
                'deposit_howto_video_url' => '',
                // Shown when no online agent covers the requested amount:
                // 'closest' shows the highest-capacity agents anyway,
                // 'empty' shows only the empty-state message.
                'withdrawal_no_match_behavior' => 'closest',

                // Banks/methods offered in the withdrawal payout form (player
                // picks one). Keep these aligned with the payment-methods
                // catalog names (editable later in Settings -> Withdrawals).
                'withdrawal_bank_options' => [
                    'TeleBirr', 'M-Pesa', 'CBE Birr', 'Dashen Bank',
                    'Awash Bank', 'Bank of Abyssinia', 'Cooperative Bank',
                    'Wegagen Bank',
                ],
                // Require the player to enter payout details (name/bank/account)
                // before they can see matched agents.
                'withdrawal_require_payout_details' => true,

                // --- Auto-message templates ---
                // Placeholders: {amount}, {withdrawal_id}, {name}, {bank}, {account}
                // NOTE: {withdrawal_id} and {account} are wrapped in backticks by
                // the widget so Telegram renders them as tap-to-copy once sent.
                'deposit_prefill_message' => 'Hi Kemerbet agent, I want to deposit',
                // Deposit questionnaire (amount + player id before the list)
                'deposit_quick_amounts' => [200, 300, 500, 1000, 2000, 5000, 10000],
                'deposit_message' => "Hi Kemerbet agent, I want to deposit {amount} ETB.\nMy Player ID: {player_id}",
                // Player-ID auto-detect on the host page (empty = off).
                // Order: window.KEMERBET_PLAYER_ID, then this localStorage key,
                // then this CSS selector.
                'player_id_storage_key' => '',
                'player_id_dom_selector' => '',
                'withdrawal_message_with_amount' => "Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw {amount} ETB.\nPlease send to:\nName: {name}\nBank: {bank}\nAccount: {account}\nI will share my withdrawal code shortly.",
                'withdrawal_message_no_amount' => 'Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw — I will share the amount and my withdrawal code shortly.',

                // --- Recents (per-player, client-side) ---
                'recents_enabled' => true,
                'recents_count' => 5,

                // --- Pair rule ---
                // Ships OFF. When on, each player only sees their own agents
                // (pair_size of them), remembered per device + player ID; no
                // full list, no offline agents, no recents, pins ignored, and
                // the player ID must be auto-detected (not typed).
                'pair_mode_enabled' => false,
                'pair_size' => 2,
                // Pair reset: when on, a player's pairing is forgotten after
                // this many hours and they get a fresh random pair.
                'pair_reset_enabled' => false,
                'pair_reset_hours' => 72,
            ];

            foreach ($settings as $key => $value) {
                // firstOrCreate: only ADD missing keys. Never overwrite a value
                // an admin has edited — this makes the seeder safe to re-run on
                // production (e.g. after a deploy that introduces new settings).
                Setting::firstOrCreate(
                    ['key' => $key],
                    [
                        'value' => $value,
                        'updated_at' => now(),
                    ]
                );
            }
        });
    }
}
