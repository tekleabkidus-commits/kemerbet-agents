<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\DailyStat;
use App\Models\PaymentMethod;
use App\Models\StatusEvent;
use App\Models\VisitEvent;
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

    /**
     * Visit -> click funnel with previous-period comparison.
     */
    public function funnel(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        return Cache::remember(
            'stats:funnel:'.$this->filterKey($from, $to, $agentId, $hourFrom, $hourTo),
            self::CACHE_TTL,
            fn () => $this->computeFunnel($from, $to, $agentId, $hourFrom, $hourTo),
        );
    }

    /**
     * Referrer / device / new-vs-returning breakdown of visit_events.
     */
    public function traffic(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        return Cache::remember(
            'stats:traffic:'.$this->filterKey($from, $to, $agentId, $hourFrom, $hourTo),
            self::CACHE_TTL,
            fn () => $this->computeTraffic($from, $to, $agentId, $hourFrom, $hourTo),
        );
    }

    /**
     * Click behavior insights: repeat clickers, distribution, referrers,
     * offline click attempts.
     */
    public function clicksInsights(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        return Cache::remember(
            'stats:clicks-insights:'.$this->filterKey($from, $to, $agentId, $hourFrom, $hourTo),
            self::CACHE_TTL,
            fn () => $this->computeClicksInsights($from, $to, $agentId, $hourFrom, $hourTo),
        );
    }

    /**
     * Per-agent performance metrics for the range.
     */
    public function agentPerformance(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        return Cache::remember(
            'stats:agent-performance:'.$this->filterKey($from, $to, $agentId, $hourFrom, $hourTo),
            self::CACHE_TTL,
            fn () => $this->computeAgentPerformance($from, $to, $agentId, $hourFrom, $hourTo),
        );
    }

    /**
     * Live-coverage and click-demand hour x weekday matrices + gap hours.
     */
    public function coverage(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        return Cache::remember(
            'stats:coverage:'.$this->filterKey($from, $to, $agentId, $hourFrom, $hourTo),
            self::CACHE_TTL,
            fn () => $this->computeCoverage($from, $to, $agentId, $hourFrom, $hourTo),
        );
    }

    /**
     * Clicks/hour while pinned vs unpinned, per agent with pin history.
     */
    public function pinEffectiveness(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        return Cache::remember(
            'stats:pin-effectiveness:'.$this->filterKey($from, $to, $agentId, $hourFrom, $hourTo),
            self::CACHE_TTL,
            fn () => $this->computePinEffectiveness($from, $to, $agentId, $hourFrom, $hourTo),
        );
    }

    /**
     * Batched 14-day click sparkline series per agent (window ends at $to).
     */
    public function sparklines(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        return Cache::remember(
            'stats:sparklines:'.$this->filterKey($from, $to, $agentId, $hourFrom, $hourTo),
            self::CACHE_TTL,
            fn () => $this->computeSparklines($to, $agentId, $hourFrom, $hourTo),
        );
    }

    /**
     * All-time records. Ignores date/hour filters by design; honors agent_id.
     */
    public function records(?int $agentId): array
    {
        return Cache::remember(
            'stats:records:'.($agentId ?? 'all'),
            self::CACHE_TTL,
            fn () => $this->computeRecords($agentId),
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
            'payment_methods' => $this->computeAgentPaymentMethods($agent, $from, $to),
        ];
    }

    /**
     * This agent's deposit clicks aggregated by payment method slug.
     * Slugs no longer present in payment_methods are skipped; percentages
     * are shares of the remaining (known-slug) click total.
     */
    private function computeAgentPaymentMethods(Agent $agent, Carbon $from, Carbon $to): array
    {
        $end = $to->copy()->addDay();
        $clickCounts = collect(DB::select(
            'SELECT element AS slug, COUNT(*) AS count
             FROM click_events
             CROSS JOIN LATERAL jsonb_array_elements_text(payment_methods) AS element
             WHERE agent_id = ? AND click_type = ? AND created_at >= ? AND created_at < ? AND payment_methods IS NOT NULL
             GROUP BY element',
            [$agent->id, 'deposit', $from, $end],
        ))->pluck('count', 'slug');

        $methods = PaymentMethod::whereIn('slug', $clickCounts->keys())->get()->keyBy('slug');

        $known = $clickCounts->filter(fn ($count, $slug) => $methods->has($slug));
        $total = (int) $known->sum();

        return $known
            ->map(fn ($count, $slug) => [
                'slug' => $slug,
                'display_name' => $methods->get($slug)->display_name,
                'clicks' => (int) $count,
                'percentage' => $total > 0 ? round((int) $count / $total * 100, 1) : 0,
            ])
            ->sortByDesc('clicks')
            ->values()
            ->all();
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

    // -----------------------------------------------------------------
    // Filtered analytics (funnel / traffic / clicks / performance / coverage)
    // -----------------------------------------------------------------

    private function computeFunnel(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        $days = (int) $from->diffInDays($to) + 1;
        $prevTo = $from->copy()->subDay();
        $prevFrom = $prevTo->copy()->subDays($days - 1);

        $current = $this->funnelMetrics($from, $to, $agentId, $hourFrom, $hourTo);
        $previous = $this->funnelMetrics($prevFrom, $prevTo, $agentId, $hourFrom, $hourTo);

        $change = [];
        foreach ($current as $key => $value) {
            $prev = $previous[$key];
            $change[$key] = $prev > 0 ? round(($value - $prev) / $prev * 100, 1) : null;
        }

        return [
            'current' => $current,
            'previous' => $previous,
            'change' => $change,
            'previous_range' => ['from' => $prevFrom->toDateString(), 'to' => $prevTo->toDateString()],
        ];
    }

    private function funnelMetrics(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        $end = $to->copy()->addDay();

        // visit_events has no agent link — visit metrics stay site-wide even
        // when agent_id is set; only click metrics are agent-scoped.
        $visits = VisitEvent::where('created_at', '>=', $from)->where('created_at', '<', $end);
        $this->applyHourFilter($visits, $hourFrom, $hourTo);
        $totalVisits = (clone $visits)->count();
        $uniqueVisitors = (clone $visits)->distinct()->count('visitor_id');

        $clicks = ClickEvent::where('click_type', 'deposit')
            ->where('created_at', '>=', $from)->where('created_at', '<', $end)
            ->when($agentId, fn ($q) => $q->where('agent_id', $agentId));
        $this->applyHourFilter($clicks, $hourFrom, $hourTo);
        $depositClicks = (clone $clicks)->count();
        $uniqueClickers = (clone $clicks)->distinct()->count('visitor_id');

        return [
            'total_visits' => $totalVisits,
            'unique_visitors' => $uniqueVisitors,
            'deposit_clicks' => $depositClicks,
            'unique_clickers' => $uniqueClickers,
            'visit_to_click_rate' => $uniqueVisitors > 0 ? round($uniqueClickers / $uniqueVisitors, 4) : 0,
        ];
    }

    private function computeTraffic(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        $end = $to->copy()->addDay();

        $base = function () use ($from, $end, $hourFrom, $hourTo) {
            $q = VisitEvent::where('created_at', '>=', $from)->where('created_at', '<', $end);
            $this->applyHourFilter($q, $hourFrom, $hourTo);

            return $q;
        };

        $referrers = $this->normalizeReferrers(
            $base()->selectRaw('referrer, COUNT(*) AS count')->groupBy('referrer')->get()
        );

        $deviceRows = $base()
            ->selectRaw("CASE WHEN user_agent ~* 'Mobile|Android|iPhone|iPad' THEN 'mobile'
                              WHEN user_agent ~* 'Windows|Macintosh|X11|Linux' THEN 'desktop'
                              ELSE 'other' END AS device, COUNT(*) AS count")
            ->groupBy('device')
            ->pluck('count', 'device');

        // A visitor is "new" when their first-ever visit falls inside the
        // range; first-seen is computed over all history (not hour-filtered).
        $hourSql = $this->hourFilterSql('created_at', $hourFrom, $hourTo);
        $newVsReturning = DB::select(
            'SELECT COUNT(*) FILTER (WHERE first_seen >= ?) AS new_count,
                    COUNT(*) FILTER (WHERE first_seen < ?) AS returning_count
             FROM (
                 SELECT visitor_id, MIN(created_at) AS first_seen
                 FROM visit_events
                 WHERE visitor_id IN (
                     SELECT DISTINCT visitor_id FROM visit_events
                     WHERE created_at >= ? AND created_at < ?'.($hourSql ? " AND {$hourSql}" : '').'
                 )
                 GROUP BY visitor_id
             ) t',
            [$from, $from, $from, $end],
        )[0];

        $result = [
            'referrers' => $referrers,
            'devices' => [
                'mobile' => (int) ($deviceRows['mobile'] ?? 0),
                'desktop' => (int) ($deviceRows['desktop'] ?? 0),
                'other' => (int) ($deviceRows['other'] ?? 0),
            ],
            'new_vs_returning' => [
                'new' => (int) $newVsReturning->new_count,
                'returning' => (int) $newVsReturning->returning_count,
            ],
        ];

        // visit_events carries no agent_id, so traffic cannot be agent-scoped.
        if ($agentId !== null) {
            $result['agent_filter_unsupported'] = true;
        }

        return $result;
    }

    private function computeClicksInsights(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        $end = $to->copy()->addDay();

        $base = function () use ($from, $end, $agentId, $hourFrom, $hourTo) {
            $q = ClickEvent::where('click_type', 'deposit')
                ->where('created_at', '>=', $from)->where('created_at', '<', $end)
                ->when($agentId, fn ($qq) => $qq->where('agent_id', $agentId));
            $this->applyHourFilter($q, $hourFrom, $hourTo);

            return $q;
        };

        $dayCounts = $base()
            ->selectRaw('visitor_id, COUNT(DISTINCT DATE(created_at)) AS days')
            ->groupBy('visitor_id')
            ->pluck('days');

        $perVisitor = $base()
            ->selectRaw('visitor_id, COUNT(*) AS clicks')
            ->groupBy('visitor_id')
            ->pluck('clicks');

        // Buckets: 1, 2-3, 4-10 (inclusive), 10+ meaning more than 10.
        $distribution = ['1' => 0, '2-3' => 0, '4-10' => 0, '10+' => 0];
        foreach ($perVisitor as $clicks) {
            $bucket = match (true) {
                $clicks <= 1 => '1',
                $clicks <= 3 => '2-3',
                $clicks <= 10 => '4-10',
                default => '10+',
            };
            $distribution[$bucket]++;
        }

        $clickReferrers = $this->normalizeReferrers(
            $base()->selectRaw('referrer, COUNT(*) AS count')->groupBy('referrer')->get()
        );

        // Offline attempt method: a click counts as offline when the agent's
        // most recent lifecycle status event (went_online/extended/
        // went_offline/session_expired) at the click timestamp is an offline
        // one — or when the agent has no lifecycle events at all. live_until
        // history is not stored, so the event stream is the best available
        // record of liveness at click time.
        $hourSql = $this->hourFilterSql('c.created_at', $hourFrom, $hourTo);
        $offlineAttempts = (int) DB::select(
            "SELECT COUNT(*) AS count FROM click_events c
             WHERE c.click_type = 'deposit' AND c.created_at >= ? AND c.created_at < ?"
            .($agentId ? ' AND c.agent_id = '.((int) $agentId) : '')
            .($hourSql ? " AND {$hourSql}" : '')
            ." AND COALESCE((
                 SELECT se.event_type FROM status_events se
                 WHERE se.agent_id = c.agent_id
                   AND se.event_type IN ('went_online', 'extended', 'went_offline', 'session_expired')
                   AND se.created_at <= c.created_at
                 ORDER BY se.created_at DESC, se.id DESC LIMIT 1
               ), 'none') NOT IN ('went_online', 'extended')",
            [$from, $end],
        )[0]->count;

        return [
            'repeat_clickers' => $dayCounts->filter(fn ($d) => $d >= 2)->count(),
            'one_day_clickers' => $dayCounts->filter(fn ($d) => $d == 1)->count(),
            'clicks_per_visitor_distribution' => $distribution,
            'click_referrers' => $clickReferrers,
            'offline_click_attempts' => $offlineAttempts,
        ];
    }

    private function computeAgentPerformance(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        $hourFiltered = $hourFrom !== null && $hourTo !== null;
        $end = $to->copy()->addDay();
        $days = (int) $from->diffInDays($to) + 1;

        $agents = Agent::when($agentId, fn ($q) => $q->where('id', $agentId))
            ->orderBy('display_number')
            ->get(['id', 'display_number', 'telegram_username']);

        // Deposit clicks always come from raw click_events (hour-filterable
        // and exact); daily_stats rollups only feed the minutes/session
        // metrics below.
        $clickQ = ClickEvent::where('click_type', 'deposit')
            ->where('created_at', '>=', $from)->where('created_at', '<', $end)
            ->when($agentId, fn ($q) => $q->where('agent_id', $agentId));
        $this->applyHourFilter($clickQ, $hourFrom, $hourTo);
        $clicks = $clickQ->groupBy('agent_id')->selectRaw('agent_id, COUNT(*) AS count')->pluck('count', 'agent_id');

        $rollups = $this->getAgentRows($from, $to, $agentId)->groupBy('agent_id');

        $offQ = StatusEvent::whereIn('event_type', [StatusEvent::EVENT_SESSION_EXPIRED, StatusEvent::EVENT_WENT_OFFLINE])
            ->where('created_at', '>=', $from)->where('created_at', '<', $end)
            ->when($agentId, fn ($q) => $q->where('agent_id', $agentId));
        $this->applyHourFilter($offQ, $hourFrom, $hourTo);
        $offRows = $offQ->groupBy('agent_id')
            ->selectRaw("agent_id,
                COUNT(*) FILTER (WHERE event_type = 'session_expired') AS expired,
                COUNT(*) FILTER (WHERE event_type = 'went_offline') AS manual")
            ->get()
            ->keyBy('agent_id');

        // Post-offline notifications answered by a went_online within 60 min.
        $hourSql = $this->hourFilterSql('n.created_at', $hourFrom, $hourTo);
        $notifRows = collect(DB::select(
            "SELECT n.agent_id, COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE EXISTS (
                        SELECT 1 FROM status_events se
                        WHERE se.agent_id = n.agent_id AND se.event_type = 'went_online'
                          AND se.created_at > n.created_at
                          AND se.created_at <= n.created_at + INTERVAL '60 minutes'
                    )) AS responded
             FROM notification_log n
             WHERE n.notification_type LIKE '%post_offline%'
               AND n.created_at >= ? AND n.created_at < ?"
            .($agentId ? ' AND n.agent_id = '.((int) $agentId) : '')
            .($hourSql ? " AND {$hourSql}" : '')
            .' GROUP BY n.agent_id',
            [$from, $end],
        ))->keyBy('agent_id');

        $rows = $agents->map(function (Agent $agent) use ($clicks, $rollups, $offRows, $notifRows, $days) {
            $r = $rollups->get($agent->id, collect());
            $minutes = (int) $r->sum('minutes_live');
            $sessions = (int) $r->sum('times_went_online');
            $liveDays = $r->filter(fn ($x) => $x['minutes_live'] >= 1)->count();
            $clickCount = (int) ($clicks->get($agent->id) ?? 0);
            $off = $offRows->get($agent->id);
            $notif = $notifRows->get($agent->id);
            $expired = (int) ($off->expired ?? 0);
            $manual = (int) ($off->manual ?? 0);

            return [
                'agent_id' => $agent->id,
                'display_number' => $agent->display_number,
                'telegram_username' => $agent->telegram_username,
                'deposit_clicks' => $clickCount,
                'minutes_live' => $minutes,
                'clicks_per_hour_online' => $minutes > 0 ? round($clickCount / ($minutes / 60), 2) : null,
                'uptime_days' => round($liveDays / $days, 4),
                'sessions' => $sessions,
                'avg_session_minutes' => $sessions > 0 ? (int) round($minutes / $sessions) : 0,
                'expired_offline_count' => $expired,
                'manual_offline_count' => $manual,
                'expired_vs_manual_offline' => $manual > 0 ? round($expired / $manual, 2) : null,
                'notification_response_rate' => ($notif && (int) $notif->total > 0)
                    ? round((int) $notif->responded / (int) $notif->total, 4)
                    : null,
            ];
        })->sortByDesc('deposit_clicks')->values()->all();

        return [
            'agents' => $rows,
            // Minutes/session metrics come from daily_stats rollups, which
            // have no hour granularity — flagged instead of silently wrong.
            'hour_filter_unsupported' => $hourFiltered
                ? ['minutes_live', 'clicks_per_hour_online', 'uptime_days', 'sessions', 'avg_session_minutes']
                : [],
        ];
    }

    private function computeCoverage(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        $rangeEnd = $to->copy()->addDay();
        $now = now();
        $effectiveEnd = $rangeEnd->lt($now) ? $rangeEnd : $now->copy();

        // Live agent-hours per concrete date-hour slot.
        $liveBySlot = [];
        foreach ($this->liveIntervals($from, $effectiveEnd, $agentId) as [$start, $intervalEnd]) {
            $this->accumulateHourFractions($start, $intervalEnd, $liveBySlot);
        }

        $occurrences = [];
        $liveByDowHour = [];
        $gaps = [];
        $day = $from->copy();
        while ($day->lt($rangeEnd)) {
            foreach (range(0, 23) as $hour) {
                $slotStart = $day->copy()->setTime($hour, 0);
                if ($slotStart->gte($effectiveEnd) || ! $this->hourAllowed($hour, $hourFrom, $hourTo)) {
                    continue;
                }
                $dowKey = $slotStart->dayOfWeek.'|'.$hour;
                $occurrences[$dowKey] = ($occurrences[$dowKey] ?? 0) + 1;
                $live = $liveBySlot[$day->format('Y-m-d').'|'.$hour] ?? 0.0;
                $liveByDowHour[$dowKey] = ($liveByDowHour[$dowKey] ?? 0) + $live;
                if ($live == 0.0) {
                    $gaps[] = ['date' => $day->toDateString(), 'hour' => $hour];
                }
            }
            $day->addDay();
        }

        $liveMatrix = [];
        foreach ($occurrences as $dowKey => $count) {
            $avg = $liveByDowHour[$dowKey] / $count;
            if ($avg > 0) {
                [$dow, $hour] = explode('|', $dowKey);
                $liveMatrix[] = ['day' => (int) $dow, 'hour' => (int) $hour, 'avg_agents_live' => round($avg, 2)];
            }
        }

        // Click-demand matrix — mirrors computeHeatmap with the filter
        // contract applied.
        $clickQ = ClickEvent::where('click_type', 'deposit')
            ->where('created_at', '>=', $from)->where('created_at', '<', $rangeEnd)
            ->when($agentId, fn ($q) => $q->where('agent_id', $agentId));
        $this->applyHourFilter($clickQ, $hourFrom, $hourTo);
        $clicksMatrix = $clickQ
            ->selectRaw('EXTRACT(DOW FROM created_at) AS day, EXTRACT(HOUR FROM created_at) AS hour, COUNT(*) AS count')
            ->groupByRaw('EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at)')
            ->get()
            ->map(fn ($row) => [
                'day' => (int) $row->day,
                'hour' => (int) $row->hour,
                'count' => (int) $row->count,
            ])
            ->all();

        return [
            'live_matrix' => $liveMatrix,
            'clicks_matrix' => $clicksMatrix,
            'gap_hours' => $gaps,
        ];
    }

    private function computePinEffectiveness(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        $rangeEnd = $to->copy()->addDay();
        $now = now();
        $effectiveEnd = $rangeEnd->lt($now) ? $rangeEnd : $now->copy();

        // Pinned intervals reconstructed from pinned_by_admin/unpinned_by_admin
        // events; an interval still open at range end is clipped to "now".
        $intervalsByAgent = $this->pinnedIntervals($from, $effectiveEnd, $agentId);

        if ($intervalsByAgent === []) {
            return ['agents' => [], 'aggregate' => null];
        }

        $totalHours = $this->rangeHours($from, $rangeEnd, $effectiveEnd, $hourFrom, $hourTo);

        $agents = Agent::whereIn('id', array_keys($intervalsByAgent))
            ->get(['id', 'display_number', 'telegram_username'])
            ->keyBy('id');

        $aggPinnedHours = 0.0;
        $aggUnpinnedHours = 0.0;
        $aggPinnedClicks = 0;
        $aggUnpinnedClicks = 0;

        $rows = [];
        foreach ($intervalsByAgent as $id => $intervals) {
            $agent = $agents->get($id);
            if (! $agent) {
                continue; // deleted agent
            }

            $bucket = [];
            foreach ($intervals as [$start, $end]) {
                $this->accumulateHourFractions($start, $end, $bucket);
            }
            $pinnedHours = 0.0;
            foreach ($bucket as $key => $fraction) {
                $hour = (int) substr($key, strrpos($key, '|') + 1);
                if ($this->hourAllowed($hour, $hourFrom, $hourTo)) {
                    $pinnedHours += $fraction;
                }
            }
            $unpinnedHours = max(0.0, $totalHours - $pinnedHours);

            $clickQ = ClickEvent::where('click_type', 'deposit')
                ->where('agent_id', $id)
                ->where('created_at', '>=', $from)->where('created_at', '<', $rangeEnd);
            $this->applyHourFilter($clickQ, $hourFrom, $hourTo);
            $clickTimes = $clickQ->pluck('created_at');

            $pinnedClicks = 0;
            foreach ($clickTimes as $clickedAt) {
                foreach ($intervals as [$start, $end]) {
                    if ($clickedAt->gte($start) && $clickedAt->lt($end)) {
                        $pinnedClicks++;
                        break;
                    }
                }
            }
            $unpinnedClicks = $clickTimes->count() - $pinnedClicks;

            $aggPinnedHours += $pinnedHours;
            $aggUnpinnedHours += $unpinnedHours;
            $aggPinnedClicks += $pinnedClicks;
            $aggUnpinnedClicks += $unpinnedClicks;

            $rows[] = [
                'agent_id' => $id,
                'display_number' => $agent->display_number,
                'telegram_username' => $agent->telegram_username,
                'pinned_hours' => round($pinnedHours, 2),
                'unpinned_hours' => round($unpinnedHours, 2),
                'pinned_clicks' => $pinnedClicks,
                'unpinned_clicks' => $unpinnedClicks,
                'pinned_clicks_per_hour' => $pinnedHours > 0 ? round($pinnedClicks / $pinnedHours, 2) : null,
                'unpinned_clicks_per_hour' => $unpinnedHours > 0 ? round($unpinnedClicks / $unpinnedHours, 2) : null,
                'insufficient_data' => $pinnedHours < 2 || $unpinnedHours < 2,
            ];
        }

        return [
            'agents' => array_values($rows),
            'aggregate' => $rows === [] ? null : [
                'pinned_hours' => round($aggPinnedHours, 2),
                'unpinned_hours' => round($aggUnpinnedHours, 2),
                'pinned_clicks' => $aggPinnedClicks,
                'unpinned_clicks' => $aggUnpinnedClicks,
                'pinned_clicks_per_hour' => $aggPinnedHours > 0 ? round($aggPinnedClicks / $aggPinnedHours, 2) : null,
                'unpinned_clicks_per_hour' => $aggUnpinnedHours > 0 ? round($aggUnpinnedClicks / $aggUnpinnedHours, 2) : null,
                'insufficient_data' => $aggPinnedHours < 2 || $aggUnpinnedHours < 2,
            ],
        ];
    }

    private function computeSparklines(Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): array
    {
        // Fixed 14-day window ending at the range's last day — sparklines are
        // a fixed-width visual, so the range's `from` is intentionally unused.
        $start = $to->copy()->subDays(13);
        $end = $to->copy()->addDay();

        $q = ClickEvent::where('click_type', 'deposit')
            ->where('created_at', '>=', $start)->where('created_at', '<', $end)
            ->when($agentId, fn ($qq) => $qq->where('agent_id', $agentId));
        $this->applyHourFilter($q, $hourFrom, $hourTo);
        $rows = $q->selectRaw('agent_id, DATE(created_at) AS day, COUNT(*) AS count')
            ->groupByRaw('agent_id, DATE(created_at)')
            ->get();

        $days = [];
        foreach (range(0, 13) as $i) {
            $days[] = $start->copy()->addDays($i)->toDateString();
        }

        $byAgent = [];
        foreach ($rows as $row) {
            $byAgent[$row->agent_id][substr((string) $row->day, 0, 10)] = (int) $row->count;
        }

        $series = [];
        foreach ($byAgent as $id => $counts) {
            $series[(string) $id] = array_map(fn ($day) => $counts[$day] ?? 0, $days);
        }

        return [
            'days' => $days,
            'agents' => $series === [] ? new \stdClass : $series,
        ];
    }

    private function computeRecords(?int $agentId): array
    {
        // All-time absolutes: ignores date and hour filters by design.
        // visit_events has no agent link, so visit records stay site-wide.
        $bestVisitDay = VisitEvent::selectRaw('DATE(created_at) AS day, COUNT(*) AS count')
            ->groupByRaw('DATE(created_at)')->orderByDesc('count')->orderBy('day')->first();
        $bestVisitHour = VisitEvent::selectRaw("date_trunc('hour', created_at) AS slot, COUNT(*) AS count")
            ->groupByRaw("date_trunc('hour', created_at)")->orderByDesc('count')->orderBy('slot')->first();

        $clickQ = fn () => ClickEvent::where('click_type', 'deposit')
            ->when($agentId, fn ($q) => $q->where('agent_id', $agentId));
        $bestClickDay = $clickQ()->selectRaw('DATE(created_at) AS day, COUNT(*) AS count')
            ->groupByRaw('DATE(created_at)')->orderByDesc('count')->orderBy('day')->first();
        $bestClickHour = $clickQ()->selectRaw("date_trunc('hour', created_at) AS slot, COUNT(*) AS count")
            ->groupByRaw("date_trunc('hour', created_at)")->orderByDesc('count')->orderBy('slot')->first();

        $fmtDay = fn ($row) => $row ? ['date' => substr((string) $row->day, 0, 10), 'count' => (int) $row->count] : null;
        $fmtHour = fn ($row) => $row ? ['hour' => (string) $row->slot, 'count' => (int) $row->count] : null;

        return [
            'best_visit_day' => $fmtDay($bestVisitDay),
            'best_visit_hour' => $fmtHour($bestVisitHour),
            'best_click_day' => $fmtDay($bestClickDay),
            'best_click_hour' => $fmtHour($bestClickHour),
        ];
    }

    // -----------------------------------------------------------------
    // Filter + interval helpers
    // -----------------------------------------------------------------

    private function filterKey(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo): string
    {
        return "{$from->toDateString()}:{$to->toDateString()}:".($agentId ?? 'all').':'.($hourFrom ?? '-').':'.($hourTo ?? '-');
    }

    /**
     * Timestamps are stored as EAT strings (see CLAUDE.md timezone notes),
     * so EXTRACT(HOUR ...) yields the Africa/Addis_Ababa hour directly.
     * Wrap-around ranges (e.g. 22-04) select hours >= from OR <= to.
     * Bounds are validated 0-23 integers, safe to inline.
     */
    private function hourFilterSql(string $column, ?int $hourFrom, ?int $hourTo): ?string
    {
        if ($hourFrom === null || $hourTo === null) {
            return null;
        }
        if ($hourFrom <= $hourTo) {
            return "EXTRACT(HOUR FROM {$column}) BETWEEN {$hourFrom} AND {$hourTo}";
        }

        return "(EXTRACT(HOUR FROM {$column}) >= {$hourFrom} OR EXTRACT(HOUR FROM {$column}) <= {$hourTo})";
    }

    private function applyHourFilter($query, ?int $hourFrom, ?int $hourTo, string $column = 'created_at'): void
    {
        $sql = $this->hourFilterSql($column, $hourFrom, $hourTo);
        if ($sql !== null) {
            $query->whereRaw($sql);
        }
    }

    private function hourAllowed(int $hour, ?int $hourFrom, ?int $hourTo): bool
    {
        if ($hourFrom === null || $hourTo === null) {
            return true;
        }

        return $hourFrom <= $hourTo
            ? ($hour >= $hourFrom && $hour <= $hourTo)
            : ($hour >= $hourFrom || $hour <= $hourTo);
    }

    /**
     * @param  Collection<int, object{referrer: ?string, count: mixed}>  $rows
     */
    private function normalizeReferrers($rows): array
    {
        return $rows->groupBy(function ($row) {
            if (! $row->referrer) {
                return 'direct';
            }

            return parse_url($row->referrer, PHP_URL_HOST) ?: 'direct';
        })->map(fn ($group, $source) => [
            'source' => $source,
            'count' => (int) $group->sum('count'),
        ])->sortByDesc('count')->values()->all();
    }

    /**
     * Reconstruct [start, end) live intervals from lifecycle status events.
     * Agents already live at $from are seeded from their latest prior event.
     */
    private function liveIntervals(Carbon $from, Carbon $end, ?int $agentId): array
    {
        $lifecycle = [
            StatusEvent::EVENT_WENT_ONLINE,
            StatusEvent::EVENT_EXTENDED,
            StatusEvent::EVENT_WENT_OFFLINE,
            StatusEvent::EVENT_SESSION_EXPIRED,
        ];
        $online = [StatusEvent::EVENT_WENT_ONLINE, StatusEvent::EVENT_EXTENDED];

        $placeholders = implode(',', array_fill(0, count($lifecycle), '?'));
        $seeds = DB::select(
            "SELECT DISTINCT ON (agent_id) agent_id, event_type FROM status_events
             WHERE created_at < ? AND event_type IN ({$placeholders})"
            .($agentId ? ' AND agent_id = '.((int) $agentId) : '')
            .' ORDER BY agent_id, created_at DESC, id DESC',
            [$from, ...$lifecycle],
        );

        $open = [];
        foreach ($seeds as $seed) {
            if (in_array($seed->event_type, $online)) {
                $open[$seed->agent_id] = $from->copy();
            }
        }

        $events = StatusEvent::whereIn('event_type', $lifecycle)
            ->where('created_at', '>=', $from)->where('created_at', '<', $end)
            ->when($agentId, fn ($q) => $q->where('agent_id', $agentId))
            ->orderBy('created_at')->orderBy('id')
            ->get(['agent_id', 'event_type', 'created_at']);

        $intervals = [];
        foreach ($events as $event) {
            $isOnline = in_array($event->event_type, $online);
            if ($isOnline && ! isset($open[$event->agent_id])) {
                $open[$event->agent_id] = $event->created_at->copy();
            } elseif (! $isOnline && isset($open[$event->agent_id])) {
                $intervals[] = [$open[$event->agent_id], $event->created_at->copy()];
                unset($open[$event->agent_id]);
            }
        }
        foreach ($open as $start) {
            $intervals[] = [$start, $end->copy()];
        }

        return $intervals;
    }

    /**
     * Reconstruct [start, end) pinned intervals per agent from pin events.
     * Agents already pinned at $from are seeded from their latest prior event.
     *
     * @return array<int, array<int, array{0: Carbon, 1: Carbon}>>
     */
    private function pinnedIntervals(Carbon $from, Carbon $end, ?int $agentId): array
    {
        $pinEvents = [StatusEvent::EVENT_PINNED_BY_ADMIN, StatusEvent::EVENT_UNPINNED_BY_ADMIN];

        $seeds = DB::select(
            'SELECT DISTINCT ON (agent_id) agent_id, event_type FROM status_events
             WHERE created_at < ? AND event_type IN (?, ?)'
            .($agentId ? ' AND agent_id = '.((int) $agentId) : '')
            .' ORDER BY agent_id, created_at DESC, id DESC',
            [$from, ...$pinEvents],
        );

        $open = [];
        foreach ($seeds as $seed) {
            if ($seed->event_type === StatusEvent::EVENT_PINNED_BY_ADMIN) {
                $open[$seed->agent_id] = $from->copy();
            }
        }

        $events = StatusEvent::whereIn('event_type', $pinEvents)
            ->where('created_at', '>=', $from)->where('created_at', '<', $end)
            ->when($agentId, fn ($q) => $q->where('agent_id', $agentId))
            ->orderBy('created_at')->orderBy('id')
            ->get(['agent_id', 'event_type', 'created_at']);

        $intervals = [];
        foreach ($events as $event) {
            $isPin = $event->event_type === StatusEvent::EVENT_PINNED_BY_ADMIN;
            if ($isPin && ! isset($open[$event->agent_id])) {
                $open[$event->agent_id] = $event->created_at->copy();
            } elseif (! $isPin && isset($open[$event->agent_id])) {
                $intervals[$event->agent_id][] = [$open[$event->agent_id], $event->created_at->copy()];
                unset($open[$event->agent_id]);
            } elseif (! $isPin) {
                // Unpin without a tracked pin start: agent was pinned for some
                // window entirely before the range — nothing to add.
                $intervals[$event->agent_id] ??= [];
            }
        }
        foreach ($open as $id => $start) {
            $intervals[$id][] = [$start, $end->copy()];
        }

        return $intervals;
    }

    /**
     * Total hour-filtered hours available between $from and range end,
     * clipped to "now" for ranges that include today.
     */
    private function rangeHours(Carbon $from, Carbon $rangeEnd, Carbon $effectiveEnd, ?int $hourFrom, ?int $hourTo): float
    {
        $total = 0.0;
        $day = $from->copy();
        while ($day->lt($rangeEnd)) {
            foreach (range(0, 23) as $hour) {
                if (! $this->hourAllowed($hour, $hourFrom, $hourTo)) {
                    continue;
                }
                $slotStart = $day->copy()->setTime($hour, 0);
                if ($slotStart->gte($effectiveEnd)) {
                    continue;
                }
                $slotEnd = $slotStart->copy()->addHour();
                $chunkEnd = $slotEnd->lt($effectiveEnd) ? $slotEnd : $effectiveEnd->copy();
                $total += $slotStart->diffInSeconds($chunkEnd) / 3600;
            }
            $day->addDay();
        }

        return $total;
    }

    /**
     * Split [start, end) into fractional hours keyed 'Y-m-d|H'.
     */
    private function accumulateHourFractions(Carbon $start, Carbon $end, array &$bucket): void
    {
        $t = $start->copy();
        while ($t->lt($end)) {
            $slotEnd = $t->copy()->startOfHour()->addHour();
            $chunkEnd = $slotEnd->lt($end) ? $slotEnd : $end->copy();
            $key = $t->format('Y-m-d').'|'.$t->hour;
            $bucket[$key] = ($bucket[$key] ?? 0) + $t->diffInSeconds($chunkEnd) / 3600;
            $t = $chunkEnd;
        }
    }
}
