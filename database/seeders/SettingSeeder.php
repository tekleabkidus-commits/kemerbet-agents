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
            ];

            foreach ($settings as $key => $value) {
                Setting::updateOrCreate(
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
