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
                'withdrawals_enabled' => true,
                'withdrawal_min' => 200,
                'withdrawal_max_default' => 10000,
                'withdrawal_quick_amounts' => [200, 500, 1000, 3000, 5000, 10000, 25000, 50000, 100000],
                // Relative path only — the widget prepends the origin of the
                // domain it is embedded on, so this works across all domains.
                'withdrawal_redirect_path' => '/sport/popup/withdrawal',
                'withdrawal_howto_video_url' => '',
                // Shown when no online agent covers the requested amount:
                // 'closest' shows the highest-capacity agents anyway,
                // 'empty' shows only the empty-state message.
                'withdrawal_no_match_behavior' => 'closest',

                // Banks/methods offered in the withdrawal payout form (player picks one).
                'withdrawal_bank_options' => [
                    'Telebirr', 'CBE', 'CBE Birr', 'Awash Bank', 'Dashen Bank',
                    'Bank of Abyssinia', 'Wegagen Bank', 'Hibret Bank', 'Nib Bank',
                    'Cooperative Bank of Oromia', 'M-Pesa',
                ],
                // Require the player to enter payout details (name/bank/account)
                // before they can see matched agents.
                'withdrawal_require_payout_details' => true,

                // --- Auto-message templates ---
                // Placeholders: {amount}, {withdrawal_id}, {name}, {bank}, {account}
                // NOTE: {withdrawal_id} and {account} are wrapped in backticks by
                // the widget so Telegram renders them as tap-to-copy once sent.
                'deposit_prefill_message' => 'Hi Kemerbet agent, I want to deposit',
                'withdrawal_message_with_amount' => "Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw {amount} ETB.\nPlease send to:\nName: {name}\nBank: {bank}\nAccount: {account}\nI will share my withdrawal code shortly.",
                'withdrawal_message_no_amount' => 'Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw — I will share the amount and my withdrawal code shortly.',

                // --- Recents (per-player, client-side) ---
                'recents_enabled' => true,
                'recents_count' => 5,
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
