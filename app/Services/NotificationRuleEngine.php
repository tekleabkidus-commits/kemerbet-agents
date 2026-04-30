<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\StatusEvent;
use Carbon\Carbon;

class NotificationRuleEngine
{
    private const TIMEZONE = 'Africa/Addis_Ababa';

    public function __construct(
        private readonly NotificationDispatcher $dispatcher,
    ) {}

    /**
     * Evaluate all active agents and dispatch any due notifications.
     */
    public function processDueNotifications(Carbon $now): void
    {
        $this->detectExpiredSessions($now);

        $agents = Agent::where('status', Agent::STATUS_ACTIVE)->get();

        foreach ($agents as $agent) {
            if ($agent->isLive()) {
                $this->evaluatePreExpiration($agent, $now);
            } else {
                $this->evaluatePostOffline($agent, $now);
            }
        }
    }

    /**
     * True when the given moment falls in sleeping hours (11 PM – 7 AM EAT).
     */
    public function isNighttime(Carbon $moment): bool
    {
        $hour = $moment->copy()->setTimezone(self::TIMEZONE)->hour;

        return $hour >= 23 || $hour < 7;
    }

    /**
     * Find agents whose live_until has passed without a corresponding
     * went_offline or session_expired event, and write session_expired.
     */
    public function detectExpiredSessions(Carbon $now): void
    {
        $agents = Agent::where('status', Agent::STATUS_ACTIVE)
            ->whereNotNull('live_until')
            ->where('live_until', '<', $now)
            ->get();

        foreach ($agents as $agent) {
            $lastOnlineEvent = $agent->statusEvents()
                ->whereIn('event_type', [
                    StatusEvent::EVENT_WENT_ONLINE,
                    StatusEvent::EVENT_EXTENDED,
                ])
                ->latest('created_at')
                ->first();

            if (! $lastOnlineEvent) {
                continue;
            }

            $hasOfflineAfter = $agent->statusEvents()
                ->whereIn('event_type', [
                    StatusEvent::EVENT_WENT_OFFLINE,
                    StatusEvent::EVENT_SESSION_EXPIRED,
                ])
                ->where('created_at', '>', $lastOnlineEvent->created_at)
                ->exists();

            if (! $hasOfflineAfter) {
                StatusEvent::create([
                    'agent_id' => $agent->id,
                    'event_type' => StatusEvent::EVENT_SESSION_EXPIRED,
                    'created_at' => $agent->live_until,
                ]);
            }
        }
    }

    // -----------------------------------------------------------------
    // Rule 2: Pre-expiration warnings (stub — E7B)
    // -----------------------------------------------------------------

    private function evaluatePreExpiration(Agent $agent, Carbon $now): void
    {
        // E7B
    }

    // -----------------------------------------------------------------
    // Rule 3: Post-offline reminders (stub — E7C)
    // -----------------------------------------------------------------

    private function evaluatePostOffline(Agent $agent, Carbon $now): void
    {
        // E7C
    }

    /**
     * Build the agent's secret page URL for notification payloads.
     */
    private function agentSecretUrl(Agent $agent): string
    {
        return '/a/'.($agent->activeToken?->token ?? 'unknown');
    }
}
