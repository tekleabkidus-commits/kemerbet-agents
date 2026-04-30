<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\NotificationLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class NotificationDispatcher
{
    private WebPush $webPush;

    public function __construct(?WebPush $webPush = null)
    {
        $this->webPush = $webPush ?? new WebPush([
            'VAPID' => [
                'subject' => config('services.webpush.subject'),
                'publicKey' => config('services.webpush.public_key'),
                'privateKey' => config('services.webpush.private_key'),
            ],
        ]);
    }

    /**
     * Send a push notification to all active subscriptions for an agent.
     *
     * Returns the count of successful deliveries.
     */
    public function dispatch(Agent $agent, string $type, array $payload): int
    {
        $subscriptions = $agent->pushSubscriptions()->active()->get();

        if ($subscriptions->isEmpty()) {
            return 0;
        }

        try {
            $encoded = json_encode($payload, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            Log::error('[push] Failed to encode payload', [
                'agent' => $agent->id,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            return 0;
        }

        $byEndpoint = $subscriptions->keyBy('endpoint');

        foreach ($subscriptions as $sub) {
            $this->webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $sub->endpoint,
                    'publicKey' => $sub->p256dh_key,
                    'authToken' => $sub->auth_key,
                ]),
                $encoded,
            );
        }

        $succeeded = 0;

        foreach ($this->webPush->flush() as $report) {
            $sub = $byEndpoint->get($report->getEndpoint());

            if (! $sub) {
                continue;
            }

            if ($report->isSuccess()) {
                $sub->update(['last_used_at' => now()]);
                $succeeded++;
            } elseif ($report->isSubscriptionExpired()) {
                $sub->update(['is_active' => false, 'failed_at' => now()]);
            }
        }

        return $succeeded;
    }

    /**
     * Dispatch a notification and log it if any deliveries succeeded.
     *
     * Checks the dedup guard first — if this (agent, type, reference_timestamp)
     * combo has already been logged, skip entirely.
     */
    public function dispatchAndLog(Agent $agent, string $type, array $payload, Carbon $referenceTimestamp): int
    {
        if (NotificationLog::hasFired($agent, $type, $referenceTimestamp)) {
            return 0;
        }

        $count = $this->dispatch($agent, $type, $payload);

        if ($count > 0) {
            NotificationLog::create([
                'agent_id' => $agent->id,
                'notification_type' => $type,
                'reference_timestamp' => $referenceTimestamp,
                'payload' => $payload,
            ]);
        }

        return $count;
    }
}
