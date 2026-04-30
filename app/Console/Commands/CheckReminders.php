<?php

namespace App\Console\Commands;

use App\Services\NotificationRuleEngine;
use Illuminate\Console\Command;

class CheckReminders extends Command
{
    protected $signature = 'agents:check-reminders';

    protected $description = 'Evaluate and dispatch due notifications for all agents';

    public function handle(NotificationRuleEngine $engine): int
    {
        $engine->processDueNotifications(now());

        return self::SUCCESS;
    }
}
