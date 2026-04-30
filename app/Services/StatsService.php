<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\DailyStat;
use App\Models\PaymentMethod;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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

    /**
     * Click heatmap: day-of-week × hour-of-day deposit click counts.
     * Returns sparse array of { day, hour, count } — frontend fills zero buckets.
     */
    public function heatmap(Carbon $from, Carbon $to): array
    {
        return Cache::remember(
            "stats:heatmap:{$from->toDateString()}:{$to->toDateString()}",
            self::CACHE_TTL,
            fn () => $this->computeHeatmap($from, $to),
        );
    }

    /**
     * Payment method breakdown: agent coverage + click counts per method.
     */
    public function paymentMethodsBreakdown(Carbon $from, Carbon $to): array
    {
        return Cache::remember(
            "stats:payment-methods:{$from->toDateString()}:{$to->toDateString()}",
            self::CACHE_TTL,
            fn () => $this->computePaymentMethodsBreakdown($from, $to),
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
                'is_live' => $agent?->live_until !== null && $agent->live_until->isFuture(),
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

    private function computeHeatmap(Carbon $from, Carbon $to): array
    {
        return ClickEvent::where('click_type', 'deposit')
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $to->copy()->addDay())
            ->selectRaw('EXTRACT(DOW FROM created_at) as day, EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count')
            ->groupByRaw('EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at)')
            ->get()
            ->map(fn ($row) => [
                'day' => (int) $row->day,
                'hour' => (int) $row->hour,
                'count' => (int) $row->count,
            ])
            ->all();
    }

    private function computePaymentMethodsBreakdown(Carbon $from, Carbon $to): array
    {
        $methods = PaymentMethod::all();

        $agentCounts = DB::table('agent_payment_methods')
            ->join('agents', function ($j) {
                $j->on('agents.id', 'agent_payment_methods.agent_id')
                    ->where('agents.status', 'active')
                    ->whereNull('agents.deleted_at');
            })
            ->selectRaw('agent_payment_methods.payment_method_id, COUNT(DISTINCT agent_payment_methods.agent_id) as count')
            ->groupBy('agent_payment_methods.payment_method_id')
            ->pluck('count', 'payment_method_id');

        $end = $to->copy()->addDay();
        $clickCounts = collect(DB::select(
            'SELECT element AS slug, COUNT(*) AS count
             FROM click_events
             CROSS JOIN LATERAL jsonb_array_elements_text(payment_methods) AS element
             WHERE click_type = ? AND created_at >= ? AND created_at < ? AND payment_methods IS NOT NULL
             GROUP BY element',
            ['deposit', $from, $end],
        ))->pluck('count', 'slug');

        return $methods->map(fn (PaymentMethod $pm) => [
            'slug' => $pm->slug,
            'display_name' => $pm->display_name,
            'agent_count' => (int) ($agentCounts->get($pm->id) ?? 0),
            'click_count' => (int) ($clickCounts->get($pm->slug) ?? 0),
        ])
            ->sortByDesc('click_count')
            ->values()
            ->all();
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
