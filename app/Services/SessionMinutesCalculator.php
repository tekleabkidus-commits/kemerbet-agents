<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\StatusEvent;
use Carbon\Carbon;

/**
 * Stateless helper that computes total minutes an agent was live
 * within an arbitrary [rangeStart, rangeEnd) time window.
 *
 * Used by AgentMetricsService (today's metrics on agent page)
 * and DailyStatsService (nightly rollup into daily_stats).
 */
class SessionMinutesCalculator
{
    /**
     * Compute total minutes agent was live within [rangeStart, rangeEnd).
     */
    public function calculate(int $agentId, Carbon $rangeStart, Carbon $rangeEnd): int
    {
        $agent = Agent::find($agentId);

        if (! $agent) {
            return 0;
        }

        $totalMinutes = 0.0;

        // 1. Sessions that started within the range
        $onlineEvents = StatusEvent::where('agent_id', $agentId)
            ->where('event_type', StatusEvent::EVENT_WENT_ONLINE)
            ->where('created_at', '>=', $rangeStart)
            ->where('created_at', '<', $rangeEnd)
            ->orderBy('created_at')
            ->get();

        foreach ($onlineEvents as $event) {
            $totalMinutes += $this->sessionMinutesInRange($agent, $event, $rangeStart, $rangeEnd);
        }

        // 2. Overnight: session started before rangeStart, may extend into range
        $lastBefore = StatusEvent::where('agent_id', $agentId)
            ->where('event_type', StatusEvent::EVENT_WENT_ONLINE)
            ->where('created_at', '<', $rangeStart)
            ->orderBy('created_at', 'desc')
            ->first();

        if ($lastBefore) {
            $totalMinutes += $this->sessionMinutesInRange($agent, $lastBefore, $rangeStart, $rangeEnd);
        }

        return (int) $totalMinutes;
    }

    /**
     * Compute minutes a single session contributed within [rangeStart, rangeEnd).
     */
    private function sessionMinutesInRange(
        Agent $agent,
        StatusEvent $onlineEvent,
        Carbon $rangeStart,
        Carbon $rangeEnd,
    ): float {
        $end = $this->findSessionEnd($agent, $onlineEvent, $rangeEnd)->utc();
        $rStart = $rangeStart->copy()->utc();
        $rEnd = $rangeEnd->copy()->utc();
        $eventStart = $onlineEvent->created_at->copy()->utc();

        // Session ended before range — no contribution
        if ($end <= $rStart) {
            return 0;
        }

        $start = $eventStart->max($rStart);
        $end = $end->min($rEnd);

        return max(0, $start->diffInMinutes($end));
    }

    /**
     * Find when a session ended (or estimate it).
     *
     * Priority:
     * 1. Next went_offline/session_expired after went_online → that timestamp
     * 2. Agent is currently live → use $ceiling as end bound
     * 3. No offline event, not live → estimate: went_online + duration_minutes
     */
    private function findSessionEnd(Agent $agent, StatusEvent $onlineEvent, Carbon $ceiling): Carbon
    {
        $nextOffline = StatusEvent::where('agent_id', $agent->id)
            ->whereIn('event_type', [
                StatusEvent::EVENT_WENT_OFFLINE,
                StatusEvent::EVENT_SESSION_EXPIRED,
            ])
            ->where('created_at', '>', $onlineEvent->created_at)
            ->orderBy('created_at')
            ->first();

        if ($nextOffline) {
            return $nextOffline->created_at;
        }

        if ($agent->isLive()) {
            return $ceiling;
        }

        $durationMinutes = $onlineEvent->duration_minutes ?? 60;

        return $onlineEvent->created_at->copy()->addMinutes($durationMinutes);
    }
}
