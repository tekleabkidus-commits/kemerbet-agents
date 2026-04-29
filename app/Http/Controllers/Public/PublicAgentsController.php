<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\Setting;
use App\Models\StatusEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PublicAgentsController extends Controller
{
    public function index(): JsonResponse
    {
        $data = Cache::remember('public_agents', 60, function () {
            return $this->buildPayload();
        });

        return response()->json($data);
    }

    private function buildPayload(): array
    {
        $now = now();
        $recentThreshold = $now->copy()->subMinutes(30);

        $settings = Setting::whereIn('key', ['prefill_message', 'show_offline_agents', 'shuffle_live_agents'])
            ->pluck('value', 'key');

        $prefillMessage = $settings['prefill_message'] ?? 'Hi Kemerbet agent, I want to deposit';
        $showOffline = filter_var($settings['show_offline_agents'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $shuffleLive = filter_var($settings['shuffle_live_agents'] ?? true, FILTER_VALIDATE_BOOLEAN);

        $agents = Agent::where('status', Agent::STATUS_ACTIVE)
            ->with(['paymentMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order')])
            ->addSelect(['agents.*',
                'last_offline_at' => StatusEvent::select('created_at')
                    ->whereColumn('agent_id', 'agents.id')
                    ->where('event_type', StatusEvent::EVENT_WENT_OFFLINE)
                    ->latest('created_at')
                    ->limit(1),
            ])
            ->get();

        $live = $agents
            ->filter(fn (Agent $a) => $a->live_until && $a->live_until->gt($now))
            ->sortBy('display_number')
            ->values();

        $recentlyOffline = collect();
        if ($showOffline) {
            $recentlyOffline = $agents
                ->filter(function (Agent $a) use ($now, $recentThreshold) {
                    if ($a->live_until && $a->live_until->gt($now)) {
                        return false;
                    }

                    return $a->last_offline_at && $a->last_offline_at >= $recentThreshold;
                })
                ->sortByDesc('last_offline_at')
                ->values();
        }

        $result = [];

        foreach ($live as $agent) {
            $result[] = $this->transformAgent($agent, 'live');
        }

        foreach ($recentlyOffline as $agent) {
            $result[] = $this->transformAgent($agent, 'recently_offline');
        }

        return [
            'cached_at' => $now->toIso8601String(),
            'live_count' => $live->count(),
            'agents' => $result,
            'settings' => [
                'chat_prefilled_message' => $prefillMessage,
                'show_offline_agents' => $showOffline,
                'shuffle_live_agents' => $shuffleLive,
            ],
        ];
    }

    public function click(Request $request, int $agent): JsonResponse
    {
        $agentModel = Agent::find($agent);

        if (! $agentModel) {
            abort(404);
        }

        if ($agentModel->status === Agent::STATUS_DISABLED) {
            return response()->json(['message' => 'Agent not available'], 422);
        }

        $request->validate([
            'referrer' => 'nullable|string|max:2000',
        ]);

        ClickEvent::create([
            'agent_id' => $agentModel->id,
            'click_type' => 'deposit',
            'visitor_id' => hash('xxh3', config('app.key').$request->ip().$request->userAgent()),
            'ip_address' => $request->ip(),
            'referrer' => $request->input('referrer'),
            'created_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    private function transformAgent(Agent $agent, string $status): array
    {
        $data = [
            'id' => $agent->id,
            'display_number' => $agent->display_number,
            'telegram_username' => $agent->telegram_username,
            'status' => $status,
            'payment_methods' => $agent->paymentMethods->map(fn ($pm) => [
                'slug' => $pm->slug,
                'display_name' => $pm->display_name,
            ])->values()->all(),
        ];

        if ($status === 'recently_offline') {
            $data['last_seen_at'] = $agent->last_offline_at instanceof \DateTimeInterface
                ? $agent->last_offline_at->toIso8601String()
                : (string) $agent->last_offline_at;
        }

        return $data;
    }
}
