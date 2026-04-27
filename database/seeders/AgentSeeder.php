<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\AgentToken;
use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AgentSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // 18 agents from the public-agents-block.html mockup
            // + 10 additional agents to reach the 28 total from spec
            $agents = [
                ['display_number' => 1, 'telegram_username' => 'DOITFAST21'],
                ['display_number' => 2, 'telegram_username' => 'ageritu_dep'],
                ['display_number' => 3, 'telegram_username' => 'yehoneagent'],
                ['display_number' => 4, 'telegram_username' => 'kemeragent_4'],
                ['display_number' => 5, 'telegram_username' => 'pipo33'],
                ['display_number' => 6, 'telegram_username' => 'Besuufekad'],
                ['display_number' => 7, 'telegram_username' => 'DOITFAST21'],
                ['display_number' => 8, 'telegram_username' => 'Aandu22'],
                ['display_number' => 9, 'telegram_username' => 'FASTAGENT28'],
                ['display_number' => 10, 'telegram_username' => 'henok_agent10'],
                ['display_number' => 11, 'telegram_username' => 'balem18'],
                ['display_number' => 12, 'telegram_username' => 'obina_t'],
                ['display_number' => 13, 'telegram_username' => 'kemerbett'],
                ['display_number' => 14, 'telegram_username' => 'tewodros_ab'],
                ['display_number' => 15, 'telegram_username' => 'selam_agent15'],
                ['display_number' => 16, 'telegram_username' => 'dagimt_dep'],
                ['display_number' => 17, 'telegram_username' => 'betyetch'],
                ['display_number' => 18, 'telegram_username' => 'babiyosi'],
                ['display_number' => 19, 'telegram_username' => 'kemerdepositagent'],
                ['display_number' => 20, 'telegram_username' => 'abel_deposit20'],
                ['display_number' => 21, 'telegram_username' => 'meron_agent21'],
                ['display_number' => 22, 'telegram_username' => 'obina_t'],
                ['display_number' => 23, 'telegram_username' => 'yonas_dep23'],
                ['display_number' => 24, 'telegram_username' => 'biruk_agent24'],
                ['display_number' => 25, 'telegram_username' => 'hana_deposit25'],
                ['display_number' => 26, 'telegram_username' => 'leo021902'],
                ['display_number' => 27, 'telegram_username' => 'benias_z'],
                ['display_number' => 28, 'telegram_username' => 'samuel_agent28'],
            ];

            // Payment method assignment probabilities
            // telebirr = 100%, cbe_birr = 80%, mpesa = 60%, awash = 40%,
            // dashen = 30%, boa = 15%, coop = 10%, wegagen = 5%
            $methodProbabilities = [
                'telebirr' => 1.00,
                'cbe_birr' => 0.80,
                'mpesa' => 0.60,
                'awash' => 0.40,
                'dashen' => 0.30,
                'boa' => 0.15,
                'coop' => 0.10,
                'wegagen' => 0.05,
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

                // Assign payment methods only on first creation (preserves admin edits on re-seed)
                if ($agent->wasRecentlyCreated) {
                    $methodIds = [];
                    foreach ($methodProbabilities as $slug => $probability) {
                        if (isset($paymentMethods[$slug]) && (mt_rand(1, 100) / 100) <= $probability) {
                            $methodIds[] = $paymentMethods[$slug]->id;
                        }
                    }
                    $agent->paymentMethods()->sync($methodIds);
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
