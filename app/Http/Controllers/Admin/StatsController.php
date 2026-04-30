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

    private function parseRange(Request $request): array
    {
        $range = $request->input('range', '7d');

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
