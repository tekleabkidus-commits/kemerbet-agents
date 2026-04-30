<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\NotificationLog;
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
    // Rule 2: Pre-expiration warnings
    // -----------------------------------------------------------------

    private const TOLERANCE_SECONDS = 45;

    private function evaluatePreExpiration(Agent $agent, Carbon $now): void
    {
        $secondsLeft = $now->diffInSeconds($agent->live_until, false);

        if ($secondsLeft <= 0) {
            return;
        }

        $nighttime = $this->isNighttime($now);
        $url = $this->agentSecretUrl($agent);

        $thresholds = $nighttime
            ? [
                [5 * 60, NotificationLog::TYPE_SLEEP_WARNING_5, 'Your time is ending soon. Going to sleep? Switch to offline.'],
            ]
            : [
                [15 * 60, NotificationLog::TYPE_PRE_EXPIRATION_15, '15 minutes left. Tap to extend.'],
                [10 * 60, NotificationLog::TYPE_PRE_EXPIRATION_10, '10 minutes left. Tap to extend.'],
                [5 * 60, NotificationLog::TYPE_PRE_EXPIRATION_5, '5 minutes left. Extend now to stay visible.'],
            ];

        foreach ($thresholds as [$targetSeconds, $type, $body]) {
            if (abs($secondsLeft - $targetSeconds) <= self::TOLERANCE_SECONDS) {
                $this->dispatcher->dispatchAndLog(
                    $agent,
                    $type,
                    ['title' => 'Time ending soon', 'body' => $body, 'url' => $url],
                    $agent->live_until,
                );
            }
        }
    }

    // -----------------------------------------------------------------
    // Rule 3: Post-offline reminders
    // -----------------------------------------------------------------

    private function evaluatePostOffline(Agent $agent, Carbon $now): void
    {
        $offlineEvent = $agent->statusEvents()
            ->whereIn('event_type', [
                StatusEvent::EVENT_WENT_OFFLINE,
                StatusEvent::EVENT_SESSION_EXPIRED,
            ])
            ->latest('created_at')
            ->first();

        if (! $offlineEvent) {
            return;
        }

        $cameBackOnline = $agent->statusEvents()
            ->whereIn('event_type', [
                StatusEvent::EVENT_WENT_ONLINE,
                StatusEvent::EVENT_EXTENDED,
            ])
            ->where('created_at', '>', $offlineEvent->created_at)
            ->exists();

        if ($cameBackOnline) {
            return;
        }

        $nighttime = $this->isNighttime($now);

        if ($nighttime && $offlineEvent->event_type === StatusEvent::EVENT_WENT_OFFLINE) {
            return;
        }

        $anchor = $this->getOfflineAnchor($offlineEvent, $now);
        $secondsSinceAnchor = $anchor->diffInSeconds($now, false);

        if ($secondsSinceAnchor <= 0) {
            return;
        }

        $thresholds = $this->getPostOfflineThresholds($nighttime, $offlineEvent->event_type);
        $url = $this->agentSecretUrl($agent);

        foreach ($thresholds as [$targetSeconds, $type, $body]) {
            if (abs($secondsSinceAnchor - $targetSeconds) <= self::TOLERANCE_SECONDS) {
                $this->dispatcher->dispatchAndLog(
                    $agent,
                    $type,
                    ['title' => 'Come back online', 'body' => $body, 'url' => $url],
                    $anchor,
                );
            }
        }
    }

    private function getOfflineAnchor(StatusEvent $offlineEvent, Carbon $now): Carbon
    {
        $todaysSevenAm = $now->copy()->setTimezone(self::TIMEZONE)
            ->startOfDay()->addHours(7)
            ->setTimezone($now->timezone);

        if ($offlineEvent->created_at->lt($todaysSevenAm)) {
            return $todaysSevenAm;
        }

        return $offlineEvent->created_at;
    }

    private function getPostOfflineThresholds(bool $nighttime, string $eventType): array
    {
        if ($nighttime && $eventType === StatusEvent::EVENT_SESSION_EXPIRED) {
            return [
                [15 * 60, NotificationLog::TYPE_SLEEP_POST_OFFLINE_15, 'Players are waiting. If sleeping, make sure your status is offline.'],
            ];
        }

        return [
            [15 * 60, NotificationLog::TYPE_POST_OFFLINE_15MIN, 'Customers are missing you, come back online.'],
            [60 * 60, NotificationLog::TYPE_POST_OFFLINE_1H, 'You\'ve been offline for 1 hour. Come back online.'],
            [3 * 3600, NotificationLog::TYPE_POST_OFFLINE_3H, 'You\'ve been offline for 3 hours. Come back online.'],
            [6 * 3600, NotificationLog::TYPE_POST_OFFLINE_6H, 'You\'ve been offline for 6 hours. Come back online.'],
            [12 * 3600, NotificationLog::TYPE_POST_OFFLINE_12H, 'You\'ve been offline for 12 hours. Come back online.'],
        ];
    }

    /**
     * Build the agent's secret page URL for notification payloads.
     */
    private function agentSecretUrl(Agent $agent): string
    {
        return '/a/'.($agent->activeToken?->token ?? 'unknown');
    }
}
