<?php

namespace App\Console\Commands;

use App\Models\Agent;
use App\Models\NotificationLog;
use App\Services\NotificationDispatcher;
use Illuminate\Console\Command;

class WakeupAgents extends Command
{
    protected $signature = 'agents:wakeup';

    protected $description = 'Send 7 AM wakeup notification to all offline agents';

    public function handle(NotificationDispatcher $dispatcher): int
    {
        $sevenAm = now()->setTimezone('Africa/Addis_Ababa')
            ->startOfDay()->addHours(7);

        $agents = Agent::where('status', Agent::STATUS_ACTIVE)->get();

        foreach ($agents as $agent) {
            if ($agent->isLive()) {
                continue;
            }

            $token = $agent->activeToken?->token ?? 'unknown';

            $dispatcher->dispatchAndLog(
                $agent,
                NotificationLog::TYPE_WAKEUP_7AM,
                [
                    'title' => 'Good morning!',
                    'body' => 'Players are waiting for your approval. Please be online.',
                    'url' => "/a/{$token}",
                ],
                $sevenAm,
            );
        }

        return self::SUCCESS;
    }
}
