<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\DailyStat;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Query service for analytics data from daily_stats + live today fallback.
 *
 * NOTE: Results are cached for 5 minutes. Queries spanning today reflect data
 * up to 5 minutes stale. Rollup at 02:00 EAT may not be visible in cached
 * queries until natural TTL expiry. For real-time data, bypass cache directly.
 */
class StatsService
{
    private const TIMEZONE = 'Africa/Addis_Ababa';

    private const CACHE_TTL = 300; // 5 minutes

    public function __construct(
        private readonly DailyStatsService $dailyStats,
    ) {}

    /**
     * Site-wide aggregates for a date range.
     */
    public function overview(Carbon $from, Carbon $to): array
    {
        return Cache::remember(
            "stats:overview:{$from->toDateString()}:{$to->toDateString()}",
            self::CACHE_TTL,
            fn () => $this->computeOverview($from, $to),
        );
    }

    /**
     * Daily series for chart rendering. Every day in range appears, even if zero.
     */
    public function timeline(Carbon $from, Carbon $to): array
    {
        return Cache::remember(
            "stats:timeline:{$from->toDateString()}:{$to->toDateString()}",
            self::CACHE_TTL,
            fn () => $this->computeTimeline($from, $to),
        );
    }

    /**
     * Ranked agent list sorted by a metric.
     */
    public function leaderboard(Carbon $from, Carbon $to, string $sort = 'deposit_clicks', int $limit = 50): array
    {
        return Cache::remember(
            "stats:leaderboard:{$from->toDateString()}:{$to->toDateString()}:{$sort}:{$limit}",
            self::CACHE_TTL,
            fn () => $this->computeLeaderboard($from, $to, $sort, $limit),
        );
    }

    /**
     * Deep dive on one agent: summary, timeline, all-time.
     */
    public function agentDetail(Agent $agent, Carbon $from, Carbon $to): array
    {
        return Cache::remember(
            "stats:agent:{$agent->id}:{$from->toDateString()}:{$to->toDateString()}",
            self::CACHE_TTL,
            fn () => $this->computeAgentDetail($agent, $from, $to),
        );
    }

    // -----------------------------------------------------------------
    // Internal computation
    // -----------------------------------------------------------------

    private function computeOverview(Carbon $from, Carbon $to): array
    {
        $siteRows = $this->getSiteRows($from, $to);
        $agentRows = $this->getAgentRows($from, $to);

        $totalVisits = $siteRows->sum('total_visits');
        $depositClicks = $siteRows->sum('deposit_clicks');

        return [
            'total_visits' => $totalVisits,
            'unique_visitors' => $siteRows->sum('unique_visitors'),
            'deposit_clicks' => $depositClicks,
            'chat_clicks' => $siteRows->sum('chat_clicks'),
            'total_minutes_live' => $agentRows->sum('minutes_live'),
            'total_sessions' => $agentRows->sum('times_went_online'),
            'ctr' => $totalVisits > 0
                ? round($depositClicks / $totalVisits * 100, 2)
                : 0,
        ];
    }

    private function computeTimeline(Carbon $from, Carbon $to): array
    {
        $siteRows = $this->getSiteRows($from, $to)->keyBy(fn ($r) => $r['date']);

        $period = CarbonPeriod::create($from, $to);
        $timeline = [];

        foreach ($period as $day) {
            $key = $day->toDateString();
            $row = $siteRows->get($key);

            $timeline[] = [
                'date' => $key,
                'total_visits' => $row['total_visits'] ?? 0,
                'unique_visitors' => $row['unique_visitors'] ?? 0,
                'deposit_clicks' => $row['deposit_clicks'] ?? 0,
                'chat_clicks' => $row['chat_clicks'] ?? 0,
            ];
        }

        return $timeline;
    }

    private function computeLeaderboard(Carbon $from, Carbon $to, string $sort, int $limit): array
    {
        $agentRows = $this->getAgentRows($from, $to);

        $grouped = $agentRows->groupBy('agent_id')->map(function (Collection $rows, int $agentId) {
            $depositClicks = $rows->sum('deposit_clicks');
            $minutesLive = $rows->sum('minutes_live');

            return [
                'agent_id' => $agentId,
                'deposit_clicks' => $depositClicks,
                'minutes_live' => $minutesLive,
                'times_went_online' => $rows->sum('times_went_online'),
                'click_rate' => round($depositClicks / max($minutesLive, 1), 4),
            ];
        });

        $allowedSorts = ['deposit_clicks', 'minutes_live', 'click_rate', 'times_went_online'];
        $sortField = in_array($sort, $allowedSorts) ? $sort : 'deposit_clicks';

        $sorted = $grouped->sortByDesc($sortField)->take($limit)->values();

        $agentIds = $sorted->pluck('agent_id');
        $agents = Agent::whereIn('id', $agentIds)
            ->get()
            ->keyBy('id');

        return $sorted->map(function (array $row) use ($agents) {
            $agent = $agents->get($row['agent_id']);

            return [
                ...$row,
                'display_number' => $agent?->display_number,
                'telegram_username' => $agent?->telegram_username,
                'last_seen_at' => $agent?->live_until?->toIso8601String(),
            ];
        })->all();
    }

    private function computeAgentDetail(Agent $agent, Carbon $from, Carbon $to): array
    {
        $rows = $this->getAgentRows($from, $to, $agent->id);

        $depositClicks = $rows->sum('deposit_clicks');
        $minutesLive = $rows->sum('minutes_live');
        $timesOnline = $rows->sum('times_went_online');

        // All-time
        $allTime = DailyStat::where('agent_id', $agent->id)
            ->selectRaw('SUM(deposit_clicks) as deposit_clicks, SUM(minutes_live) as minutes_live, SUM(times_went_online) as times_went_online')
            ->first();

        // Per-day timeline
        $rowsByDate = $rows->keyBy(fn ($r) => $r['date']);
        $period = CarbonPeriod::create($from, $to);
        $timeline = [];

        foreach ($period as $day) {
            $key = $day->toDateString();
            $row = $rowsByDate->get($key);

            $timeline[] = [
                'date' => $key,
                'deposit_clicks' => $row['deposit_clicks'] ?? 0,
                'minutes_live' => $row['minutes_live'] ?? 0,
                'times_went_online' => $row['times_went_online'] ?? 0,
            ];
        }

        return [
            'summary' => [
                'deposit_clicks' => $depositClicks,
                'minutes_live' => $minutesLive,
                'times_went_online' => $timesOnline,
                'click_rate' => round($depositClicks / max($minutesLive, 1), 4),
                'avg_session_duration_minutes' => $timesOnline > 0
                    ? (int) round($minutesLive / $timesOnline)
                    : 0,
            ],
            'timeline' => $timeline,
            'all_time' => [
                'deposit_clicks' => (int) ($allTime->deposit_clicks ?? 0),
                'minutes_live' => (int) ($allTime->minutes_live ?? 0),
                'times_went_online' => (int) ($allTime->times_went_online ?? 0),
            ],
        ];
    }

    // -----------------------------------------------------------------
    // Data fetchers with today fallback
    // -----------------------------------------------------------------

    /**
     * Get site-wide rows for the range. Past days from daily_stats, today computed live.
     */
    private function getSiteRows(Carbon $from, Carbon $to): Collection
    {
        $today = now()->setTimezone(self::TIMEZONE)->startOfDay();
        $rows = collect();

        $pastTo = $to->lt($today) ? $to : $today->copy()->subDay();
        if ($from->lte($pastTo)) {
            $rows = DailyStat::whereNull('agent_id')
                ->where('date', '>=', $from->toDateString())
                ->where('date', '<=', $pastTo->toDateString())
                ->get()
                ->map(fn (DailyStat $r) => [
                    'date' => $r->date->toDateString(),
                    'total_visits' => $r->total_visits,
                    'unique_visitors' => $r->unique_visitors,
                    'deposit_clicks' => $r->deposit_clicks,
                    'chat_clicks' => $r->chat_clicks,
                    'minutes_live' => $r->minutes_live,
                    'times_went_online' => $r->times_went_online,
                ]);
        }

        if ($to->gte($today)) {
            $dayStart = $today;
            $dayEnd = $today->copy()->addDay();
            $live = $this->dailyStats->computeSiteDay($dayStart, $dayEnd);
            $live['date'] = $today->toDateString();
            $rows = $rows->push($live);
        }

        return $rows;
    }

    /**
     * Get per-agent rows for the range. Past days from daily_stats, today computed live.
     */
    private function getAgentRows(Carbon $from, Carbon $to, ?int $agentId = null): Collection
    {
        $today = now()->setTimezone(self::TIMEZONE)->startOfDay();
        $rows = collect();

        $pastTo = $to->lt($today) ? $to : $today->copy()->subDay();
        if ($from->lte($pastTo)) {
            $query = DailyStat::whereNotNull('agent_id')
                ->where('date', '>=', $from->toDateString())
                ->where('date', '<=', $pastTo->toDateString());

            if ($agentId) {
                $query->where('agent_id', $agentId);
            }

            $rows = $query->get()->map(fn (DailyStat $r) => [
                'date' => $r->date->toDateString(),
                'agent_id' => $r->agent_id,
                'deposit_clicks' => $r->deposit_clicks,
                'chat_clicks' => $r->chat_clicks,
                'minutes_live' => $r->minutes_live,
                'times_went_online' => $r->times_went_online,
            ]);
        }

        if ($to->gte($today)) {
            $dayStart = $today;
            $dayEnd = $today->copy()->addDay();

            $agents = $agentId
                ? collect([$agentId])
                : Agent::where('status', Agent::STATUS_ACTIVE)->pluck('id');

            foreach ($agents as $id) {
                $live = $this->dailyStats->computeAgentDay($id, $dayStart, $dayEnd);
                $live['date'] = $today->toDateString();
                $live['agent_id'] = $id;
                $rows = $rows->push($live);
            }
        }

        return $rows;
    }
}
