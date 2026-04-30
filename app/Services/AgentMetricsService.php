<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\StatusEvent;

/**
 * Computes per-agent metrics for the agent secret page.
 *
 * Today metrics are calculated in Africa/Addis_Ababa timezone.
 * Click metrics query click_events table in Africa/Addis_Ababa timezone.
 */
class AgentMetricsService
{
    private const TIMEZONE = 'Africa/Addis_Ababa';

    private const AGENT_EVENT_TYPES = [
        StatusEvent::EVENT_WENT_ONLINE,
        StatusEvent::EVENT_WENT_OFFLINE,
        StatusEvent::EVENT_SESSION_EXPIRED,
        StatusEvent::EVENT_EXTENDED,
    ];

    public function __construct(
        private readonly SessionMinutesCalculator $sessionCalculator,
    ) {}

    /**
     * Get today's metrics for an agent.
     *
     * live_time_today_minutes computation:
     *   - Find all went_online events for this agent today (Africa/Addis_Ababa)
     *   - For each: pair with next went_offline event, or now() if still live
     *   - Sum (end - start) durations in minutes
     *   - Overnight sessions straddling midnight: count only from midnight onwards
     *   - Expired sessions (no went_offline event, agent not live): use
     *     went_online.created_at + duration_minutes as end estimate
     *
     * sessions_today: count of went_online events started today (not completed).
     */
    public function getTodayMetrics(Agent $agent): array
    {
        $todayStart = now()->setTimezone(self::TIMEZONE)->startOfDay()->utc();
        $yesterdayStart = $todayStart->copy()->subDay();
        $now = now();

        $sessionsToday = StatusEvent::where('agent_id', $agent->id)
            ->where('event_type', StatusEvent::EVENT_WENT_ONLINE)
            ->where('created_at', '>=', $todayStart)
            ->where('created_at', '<=', $now)
            ->count();

        $totalMinutes = $this->sessionCalculator->calculate($agent->id, $todayStart, $now);

        $clicksToday = ClickEvent::where('agent_id', $agent->id)
            ->where('created_at', '>=', $todayStart)
            ->where('created_at', '<=', $now)
            ->count();

        $clicksYesterday = ClickEvent::where('agent_id', $agent->id)
            ->where('created_at', '>=', $yesterdayStart)
            ->where('created_at', '<', $todayStart)
            ->count();

        return [
            'clicks_today' => $clicksToday,
            'clicks_yesterday' => $clicksYesterday,
            'live_time_today_minutes' => $totalMinutes,
            'sessions_today' => $sessionsToday,
        ];
    }

    /**
     * Get the last N status events for an agent, formatted for the activity feed.
     * Only includes agent-facing event types: went_online, went_offline, extended.
     */
    public function getRecentActivity(Agent $agent, int $limit = 5): array
    {
        $events = StatusEvent::where('agent_id', $agent->id)
            ->whereIn('event_type', self::AGENT_EVENT_TYPES)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return $events->map(fn (StatusEvent $event) => [
            'event_type' => $event->event_type,
            'description' => $this->formatActivityDescription($event),
            'created_at' => $event->created_at->toIso8601String(),
        ])->all();
    }

    /**
     * Format a StatusEvent description for the activity feed.
     *
     * went_online:  "2 hour session"
     * went_offline: "Session ended"
     * extended:     "Extended to 2 hours"
     */
    private function formatActivityDescription(StatusEvent $event): string
    {
        return match ($event->event_type) {
            StatusEvent::EVENT_WENT_ONLINE => $this->formatDurationLabel($event->duration_minutes).' session',
            StatusEvent::EVENT_EXTENDED => 'Extended to '.$this->formatDurationLabel($event->duration_minutes),
            StatusEvent::EVENT_WENT_OFFLINE => 'Session ended',
            StatusEvent::EVENT_SESSION_EXPIRED => 'Session expired',
            default => $event->event_type,
        };
    }

    /**
     * Format a duration in minutes to a human-readable label.
     *
     * 15  → "15 minute"
     * 30  → "30 minute"
     * 60  → "1 hour"
     * 90  → "1 hour 30 minute"
     * 120 → "2 hour"
     */
    private function formatDurationLabel(?int $minutes): string
    {
        if ($minutes === null || $minutes <= 0) {
            return 'unknown';
        }

        $hours = intdiv($minutes, 60);
        $remainder = $minutes % 60;

        if ($hours === 0) {
            return "{$minutes} minute";
        }

        if ($remainder === 0) {
            return "{$hours} hour";
        }

        return "{$hours} hour {$remainder} minute";
    }
}
