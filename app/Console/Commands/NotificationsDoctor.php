<?php

namespace App\Console\Commands;

use App\Models\Agent;
use App\Models\NotificationLog;
use App\Models\PushSubscription;
use Illuminate\Console\Command;

class NotificationsDoctor extends Command
{
    protected $signature = 'notifications:doctor';

    protected $description = 'Check push notification configuration and delivery health';

    public function handle(): int
    {
        $publicSet = (bool) config('services.webpush.public_key');
        $privateSet = (bool) config('services.webpush.private_key');

        $this->line('VAPID public key: '.($publicSet ? 'set' : 'MISSING'));
        $this->line('VAPID private key: '.($privateSet ? 'set' : 'MISSING'));

        $activeAgentIds = Agent::where('status', Agent::STATUS_ACTIVE)->pluck('id');
        $withSubscriptions = PushSubscription::whereIn('agent_id', $activeAgentIds)
            ->distinct()
            ->count('agent_id');
        $this->line("{$withSubscriptions} of {$activeAgentIds->count()} active agents have push subscriptions");

        $latest = NotificationLog::orderByDesc('created_at')->orderByDesc('id')->first();
        if ($latest) {
            $this->line("Last notification: {$latest->notification_type} at {$latest->created_at->toDateTimeString()}");
        } else {
            $this->line('no notifications ever sent');
        }

        $last24h = NotificationLog::where('created_at', '>=', now()->subDay())->count();
        $this->line("{$last24h} notifications sent in the last 24 hours");

        $this->line('Ensure the Scheduler is enabled in Laravel Cloud environment settings — agents:check-reminders must run every minute.');

        return ($publicSet && $privateSet) ? self::SUCCESS : self::FAILURE;
    }
}
