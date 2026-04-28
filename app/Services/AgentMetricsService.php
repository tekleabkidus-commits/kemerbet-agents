<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\StatusEvent;
use Carbon\Carbon;

/**
 * Computes per-agent metrics for the agent secret page.
 *
 * Today metrics are calculated in Africa/Addis_Ababa timezone.
 * Click metrics return null in Phase C (filled in Phase D).
 */
class AgentMetricsService
{
    private const TIMEZONE = 'Africa/Addis_Ababa';

    private const AGENT_EVENT_TYPES = [
        StatusEvent::EVENT_WENT_ONLINE,
        StatusEvent::EVENT_WENT_OFFLINE,
        StatusEvent::EVENT_EXTENDED,
    ];

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
        $now = now();

        $sessionsToday = StatusEvent::where('agent_id', $agent->id)
            ->where('event_type', StatusEvent::EVENT_WENT_ONLINE)
            ->where('created_at', '>=', $todayStart)
            ->where('created_at', '<=', $now)
            ->count();

        $totalMinutes = 0;

        // 1. Sessions started today
        $todayOnlineEvents = StatusEvent::where('agent_id', $agent->id)
            ->where('event_type', StatusEvent::EVENT_WENT_ONLINE)
            ->where('created_at', '>=', $todayStart)
            ->orderBy('created_at')
            ->get();

        foreach ($todayOnlineEvents as $onlineEvent) {
            $totalMinutes += $this->computeSessionMinutes(
                $agent,
                $onlineEvent,
                $todayStart,
                $now,
            );
        }

        // 2. Overnight session: went_online before today, may extend into today
        $lastOnlineBeforeToday = StatusEvent::where('agent_id', $agent->id)
            ->where('event_type', StatusEvent::EVENT_WENT_ONLINE)
            ->where('created_at', '<', $todayStart)
            ->orderBy('created_at', 'desc')
            ->first();

        if ($lastOnlineBeforeToday) {
            $totalMinutes += $this->computeSessionMinutes(
                $agent,
                $lastOnlineBeforeToday,
                $todayStart,
                $now,
            );
        }

        return [
            'clicks_today' => null,
            'clicks_yesterday' => null,
            'live_time_today_minutes' => (int) $totalMinutes,
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
     * Compute the minutes a single session contributed to today.
     *
     * Clamps the session start to today_start (for overnight sessions)
     * and the session end to now (never count future time).
     */
    private function computeSessionMinutes(
        Agent $agent,
        StatusEvent $onlineEvent,
        Carbon $todayStart,
        Carbon $now,
    ): float {
        $end = $this->findSessionEnd($agent, $onlineEvent, $now);

        // Session ended before today — no contribution
        if ($end <= $todayStart) {
            return 0;
        }

        // Clamp start to today (overnight sessions count from midnight)
        $start = $onlineEvent->created_at->max($todayStart);
        $end = $end->min($now);

        return max(0, $start->diffInMinutes($end));
    }

    /**
     * Find when a session ended (or estimate it).
     *
     * Priority:
     * 1. Next went_offline event after the went_online → that event's timestamp
     * 2. Agent is currently live → now (session still running)
     * 3. No went_offline, not live → estimate: went_online + duration_minutes
     */
    private function findSessionEnd(
        Agent $agent,
        StatusEvent $onlineEvent,
        Carbon $now,
    ): Carbon {
        $nextOffline = StatusEvent::where('agent_id', $agent->id)
            ->where('event_type', StatusEvent::EVENT_WENT_OFFLINE)
            ->where('created_at', '>', $onlineEvent->created_at)
            ->orderBy('created_at')
            ->first();

        if ($nextOffline) {
            return $nextOffline->created_at;
        }

        if ($agent->isLive()) {
            return $now;
        }

        // Expired without went_offline event: estimate from duration_minutes.
        // Undercounts if agent extended mid-session (acceptable for v1).
        $durationMinutes = $onlineEvent->duration_minutes ?? 60;

        return $onlineEvent->created_at->copy()->addMinutes($durationMinutes);
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
