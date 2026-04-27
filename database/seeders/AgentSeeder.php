<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\AgentToken;
use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AgentSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // 24 unique agents extracted from the production public-agents-block.html.
            // All agents seeded with TeleBirr only — additional payment methods (M-Pesa,
            // CBE Birr, Dashen, Awash, BoA, Coop, Wegagen) are added per-agent via the
            // admin UI as operators discover who supports what.
            $agents = [
                ['display_number' => 1,  'telegram_username' => 'kemerdepositagent'],
                ['display_number' => 2,  'telegram_username' => 'Alemishetkemer'],
                ['display_number' => 3,  'telegram_username' => 'yehoneagent'],
                ['display_number' => 4,  'telegram_username' => 'kemeragent_4'],
                ['display_number' => 5,  'telegram_username' => 'pipo33'],
                ['display_number' => 6,  'telegram_username' => 'Besuufekad'],
                ['display_number' => 7,  'telegram_username' => 'betabreham'],
                ['display_number' => 8,  'telegram_username' => 'Aandu22'],
                ['display_number' => 9,  'telegram_username' => 'FASTAGENT28'],
                ['display_number' => 10, 'telegram_username' => 'biruk2910'],
                ['display_number' => 11, 'telegram_username' => 'balem18'],
                ['display_number' => 12, 'telegram_username' => 'obina_t'],
                ['display_number' => 13, 'telegram_username' => 'kemerbett'],
                ['display_number' => 14, 'telegram_username' => 'tewodros_ab'],
                ['display_number' => 15, 'telegram_username' => 'abrsixo'],
                ['display_number' => 16, 'telegram_username' => 'betyetch'],
                ['display_number' => 17, 'telegram_username' => 'babiyosi'],
                ['display_number' => 18, 'telegram_username' => 'DOITFAST21'],
                ['display_number' => 19, 'telegram_username' => 'leo021902'],
                ['display_number' => 20, 'telegram_username' => 'benias_z'],
                ['display_number' => 21, 'telegram_username' => 'tuneagent_999'],
                ['display_number' => 22, 'telegram_username' => 'Afnati'],
                ['display_number' => 23, 'telegram_username' => 'mekeyo1'],
                ['display_number' => 24, 'telegram_username' => 'Hayelom321'],
            ];

            $paymentMethods = PaymentMethod::all()->keyBy('slug');

            foreach ($agents as $agentData) {
                $agent = Agent::updateOrCreate(
                    ['display_number' => $agentData['display_number']],
                    [
                        'telegram_username' => $agentData['telegram_username'],
                        'status' => Agent::STATUS_ACTIVE,
                    ]
                );

                // All agents get TeleBirr only — additional methods added via admin UI
                if ($agent->wasRecentlyCreated) {
                    $telebirr = $paymentMethods->get('telebirr');
                    if ($telebirr) {
                        $agent->paymentMethods()->sync([$telebirr->id]);
                    }
                }

                // Create one active token if none exists
                $existingToken = $agent->tokens()->whereNull('revoked_at')->first();
                if (! $existingToken) {
                    AgentToken::create([
                        'agent_id' => $agent->id,
                        'token' => bin2hex(random_bytes(32)),
                        'created_at' => now(),
                    ]);
                }
            }
        });
    }
}
