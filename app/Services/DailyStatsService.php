<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\DailyStat;
use App\Models\StatusEvent;
use App\Models\VisitEvent;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DailyStatsService
{
    private const TIMEZONE = 'Africa/Addis_Ababa';

    public function __construct(
        private readonly SessionMinutesCalculator $sessionCalculator,
    ) {}

    /**
     * Aggregate raw events for a single day into daily_stats rows.
     *
     * Idempotent: deletes existing rows for the date before inserting fresh ones.
     * Creates one row per active agent + one site-wide row (agent_id=null).
     */
    public function rollupDay(Carbon $date): void
    {
        $dateString = $date->copy()->setTimezone(self::TIMEZONE)
            ->startOfDay()->toDateString();

        $start = $date->copy()->setTimezone(self::TIMEZONE)->startOfDay();
        $end = $start->copy()->addDay();

        DB::transaction(function () use ($dateString, $start, $end) {
            DailyStat::where('date', $dateString)->delete();

            $agents = Agent::where('status', Agent::STATUS_ACTIVE)->get();

            foreach ($agents as $agent) {
                DailyStat::create([
                    'date' => $dateString,
                    'agent_id' => $agent->id,
                    ...$this->computeAgentDay($agent->id, $start, $end),
                    'created_at' => now(),
                ]);
            }

            DailyStat::create([
                'date' => $dateString,
                'agent_id' => null,
                ...$this->computeSiteDay($start, $end),
                'created_at' => now(),
            ]);
        });
    }

    /**
     * Public for reuse by StatsService for today live computation.
     * Caller is responsible for proper transaction context if needed.
     */
    public function computeAgentDay(int $agentId, Carbon $start, Carbon $end): array
    {
        return [
            'total_visits' => 0,
            'unique_visitors' => 0,
            'deposit_clicks' => ClickEvent::where('agent_id', $agentId)
                ->where('click_type', 'deposit')
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->count(),
            'chat_clicks' => ClickEvent::where('agent_id', $agentId)
                ->where('click_type', 'chat')
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->count(),
            'minutes_live' => $this->sessionCalculator->calculate($agentId, $start, $end),
            'times_went_online' => StatusEvent::where('agent_id', $agentId)
                ->where('event_type', StatusEvent::EVENT_WENT_ONLINE)
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->count(),
        ];
    }

    /**
     * Public for reuse by StatsService for today live computation.
     * Caller is responsible for proper transaction context if needed.
     */
    public function computeSiteDay(Carbon $start, Carbon $end): array
    {
        return [
            'total_visits' => VisitEvent::where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->count(),
            'unique_visitors' => VisitEvent::where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->distinct('visitor_id')
                ->count('visitor_id'),
            'deposit_clicks' => ClickEvent::where('click_type', 'deposit')
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->count(),
            'chat_clicks' => ClickEvent::where('click_type', 'chat')
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->count(),
            'minutes_live' => 0,
            'times_went_online' => StatusEvent::where('event_type', StatusEvent::EVENT_WENT_ONLINE)
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->count(),
        ];
    }
}
