<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Services\StatsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function __construct(
        private readonly StatsService $stats,
    ) {}

    public function overview(Request $request): JsonResponse
    {
        [$from, $to] = $this->parseRange($request);

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'data' => $this->stats->overview($from, $to),
        ]);
    }

    public function timeline(Request $request): JsonResponse
    {
        [$from, $to] = $this->parseRange($request);

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'data' => $this->stats->timeline($from, $to),
        ]);
    }

    public function withdrawalDemand(Request $request): JsonResponse
    {
        [$from, $to] = $this->parseRange($request);

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'data' => $this->stats->withdrawalDemand($from, $to),
        ]);
    }

    public function leaderboard(Request $request): JsonResponse
    {
        $request->validate([
            'sort' => 'sometimes|in:deposit_clicks,minutes_live,click_rate,times_went_online',
            'limit' => 'sometimes|integer|min:1|max:100',
        ]);

        [$from, $to] = $this->parseRange($request);

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'data' => $this->stats->leaderboard(
                $from,
                $to,
                $request->input('sort', 'deposit_clicks'),
                (int) $request->input('limit', 50),
            ),
        ]);
    }

    public function paymentMethods(Request $request): JsonResponse
    {
        [$from, $to] = $this->parseRange($request);

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'data' => $this->stats->paymentMethodsBreakdown($from, $to),
        ]);
    }

    public function heatmap(Request $request): JsonResponse
    {
        [$from, $to] = $this->parseRange($request);

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'data' => $this->stats->heatmap($from, $to),
        ]);
    }

    public function funnel(Request $request): JsonResponse
    {
        [$from, $to, $agentId, $hourFrom, $hourTo] = $this->parseFilters($request);

        return $this->respondFiltered($from, $to, $agentId, $hourFrom, $hourTo,
            $this->stats->funnel($from, $to, $agentId, $hourFrom, $hourTo));
    }

    public function traffic(Request $request): JsonResponse
    {
        [$from, $to, $agentId, $hourFrom, $hourTo] = $this->parseFilters($request);

        return $this->respondFiltered($from, $to, $agentId, $hourFrom, $hourTo,
            $this->stats->traffic($from, $to, $agentId, $hourFrom, $hourTo));
    }

    public function clicksInsights(Request $request): JsonResponse
    {
        [$from, $to, $agentId, $hourFrom, $hourTo] = $this->parseFilters($request);

        return $this->respondFiltered($from, $to, $agentId, $hourFrom, $hourTo,
            $this->stats->clicksInsights($from, $to, $agentId, $hourFrom, $hourTo));
    }

    public function agentPerformance(Request $request): JsonResponse
    {
        [$from, $to, $agentId, $hourFrom, $hourTo] = $this->parseFilters($request);

        return $this->respondFiltered($from, $to, $agentId, $hourFrom, $hourTo,
            $this->stats->agentPerformance($from, $to, $agentId, $hourFrom, $hourTo));
    }

    public function coverage(Request $request): JsonResponse
    {
        [$from, $to, $agentId, $hourFrom, $hourTo] = $this->parseFilters($request);

        return $this->respondFiltered($from, $to, $agentId, $hourFrom, $hourTo,
            $this->stats->coverage($from, $to, $agentId, $hourFrom, $hourTo));
    }

    public function pinEffectiveness(Request $request): JsonResponse
    {
        [$from, $to, $agentId, $hourFrom, $hourTo] = $this->parseFilters($request);

        return $this->respondFiltered($from, $to, $agentId, $hourFrom, $hourTo,
            $this->stats->pinEffectiveness($from, $to, $agentId, $hourFrom, $hourTo));
    }

    public function sparklines(Request $request): JsonResponse
    {
        [$from, $to, $agentId, $hourFrom, $hourTo] = $this->parseFilters($request);

        return $this->respondFiltered($from, $to, $agentId, $hourFrom, $hourTo,
            $this->stats->sparklines($from, $to, $agentId, $hourFrom, $hourTo));
    }

    public function records(Request $request): JsonResponse
    {
        [$from, $to, $agentId, $hourFrom, $hourTo] = $this->parseFilters($request);

        // Records ignore the date/hour filters by design (all-time bests).
        return $this->respondFiltered($from, $to, $agentId, $hourFrom, $hourTo,
            $this->stats->records($agentId));
    }

    public function agentDetail(Request $request, int $agent): JsonResponse
    {
        $agentModel = Agent::find($agent);

        if (! $agentModel) {
            abort(404);
        }

        [$from, $to] = $this->parseRange($request);

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'data' => $this->stats->agentDetail($agentModel, $from, $to),
        ]);
    }

    /**
     * Global filter contract: from/to dates, optional agent_id, optional
     * hour_from/hour_to (EAT hours, wrap-around allowed). A single hour
     * bound defaults the other end (0 or 23).
     */
    private function parseFilters(Request $request): array
    {
        $request->validate([
            'agent_id' => 'sometimes|integer|exists:agents,id',
            'hour_from' => 'sometimes|integer|min:0|max:23',
            'hour_to' => 'sometimes|integer|min:0|max:23',
        ]);

        [$from, $to] = $this->parseRange($request);

        $agentId = $request->filled('agent_id') ? (int) $request->input('agent_id') : null;

        $hourFrom = null;
        $hourTo = null;
        if ($request->filled('hour_from') || $request->filled('hour_to')) {
            $hourFrom = (int) $request->input('hour_from', 0);
            $hourTo = (int) $request->input('hour_to', 23);
        }

        return [$from, $to, $agentId, $hourFrom, $hourTo];
    }

    private function respondFiltered(Carbon $from, Carbon $to, ?int $agentId, ?int $hourFrom, ?int $hourTo, array $data): JsonResponse
    {
        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'filters' => [
                'agent_id' => $agentId,
                'hour_from' => $hourFrom,
                'hour_to' => $hourTo,
            ],
            'data' => $data,
        ]);
    }

    private function parseRange(Request $request): array
    {
        $range = $request->input('range', '7d');

        // Bare from/to (without range=custom) also selects a custom range —
        // the filter contract sends dates directly.
        if ($range !== 'custom' && $request->filled('from') && $request->filled('to')) {
            $range = 'custom';
        }

        if ($range === 'custom') {
            $request->validate([
                'from' => 'required|date',
                'to' => 'required|date|after_or_equal:from',
            ]);

            return [
                Carbon::parse($request->from)->setTimezone('Africa/Addis_Ababa')->startOfDay(),
                Carbon::parse($request->to)->setTimezone('Africa/Addis_Ababa')->startOfDay(),
            ];
        }

        if ($range === 'today') {
            $to = now()->setTimezone('Africa/Addis_Ababa')->startOfDay();

            return [$to->copy(), $to];
        }

        $days = match ($range) {
            '30d' => 30,
            '90d' => 90,
            default => 7,
        };

        $to = now()->setTimezone('Africa/Addis_Ababa')->startOfDay();
        $from = $to->copy()->subDays($days - 1);

        return [$from, $to];
    }
}
