<?php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Agent\Concerns\ResolvesAgentToken;
use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Notice;
use App\Models\PushSubscription;
use App\Models\StatusEvent;
use App\Rules\AllowedDuration;
use App\Services\AgentMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AgentSecretController extends Controller
{
    use ResolvesAgentToken;

    public function __construct(
        private readonly AgentMetricsService $metrics,
    ) {}

    /**
     * Blade shell for the agent SPA.
     * Invalid/revoked token → error view (server-side, no React).
     * Valid token → Blade shell that loads the agent React entry.
     */
    public function page(string $token): View
    {
        $agent = $this->resolveAgentFromToken($token);

        if (! $agent) {
            return view('agent.invalid');
        }

        return view('agent.app', ['token' => $token]);
    }

    /**
     * Full agent state in one response.
     * Disabled agents get a reduced payload (agent identity + is_disabled).
     */
    public function state(string $token): JsonResponse
    {
        $agent = $this->resolveAgentFromToken($token);

        if (! $agent) {
            abort(404);
        }

        if ($agent->status === Agent::STATUS_DISABLED) {
            return response()->json([
                'agent' => [
                    'display_number' => $agent->display_number,
                    'telegram_username' => $agent->telegram_username,
                    'is_disabled' => true,
                ],
            ]);
        }

        return response()->json($this->buildStateResponse($agent));
    }

    /**
     * Set agent online for a given duration.
     * Validates duration against Africa/Addis_Ababa time-of-day rules.
     * Logs went_online event.
     */
    public function goOnline(Request $request, string $token): JsonResponse
    {
        $agent = $this->resolveAgentFromToken($token);

        if (! $agent) {
            abort(404);
        }

        if ($agent->status === Agent::STATUS_DISABLED) {
            return response()->json(['message' => 'Your account has been disabled.'], 422);
        }

        $validated = $request->validate([
            'duration_minutes' => ['required', 'integer', new AllowedDuration],
        ]);

        $duration = (int) $validated['duration_minutes'];

        DB::transaction(function () use ($agent, $duration, $request) {
            $agent->update(['live_until' => now()->addMinutes($duration)]);

            $agent->statusEvents()->create([
                'event_type' => StatusEvent::EVENT_WENT_ONLINE,
                'duration_minutes' => $duration,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return response()->json($this->buildStateResponse($agent->fresh()));
    }

    /**
     * Reset live_until to now + duration (strict replacement).
     * Requires agent to already be live (422 if offline).
     * Logs extended event.
     */
    public function extend(Request $request, string $token): JsonResponse
    {
        $agent = $this->resolveAgentFromToken($token);

        if (! $agent) {
            abort(404);
        }

        if ($agent->status === Agent::STATUS_DISABLED) {
            return response()->json(['message' => 'Your account has been disabled.'], 422);
        }

        if (! $agent->isLive()) {
            return response()->json(['message' => 'You must be online to extend.'], 422);
        }

        $validated = $request->validate([
            'duration_minutes' => ['required', 'integer', new AllowedDuration],
        ]);

        $duration = (int) $validated['duration_minutes'];

        DB::transaction(function () use ($agent, $duration, $request) {
            $agent->update(['live_until' => now()->addMinutes($duration)]);

            $agent->statusEvents()->create([
                'event_type' => StatusEvent::EVENT_EXTENDED,
                'duration_minutes' => $duration,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return response()->json($this->buildStateResponse($agent->fresh()));
    }

    /**
     * Set agent offline immediately (live_until = null).
     * Idempotent: already-offline agents get 200 with current state, no duplicate event.
     * Logs went_offline event only if agent was actually live.
     */
    public function goOffline(Request $request, string $token): JsonResponse
    {
        $agent = $this->resolveAgentFromToken($token);

        if (! $agent) {
            abort(404);
        }

        if (! $agent->isLive()) {
            return response()->json($this->buildStateResponse($agent));
        }

        DB::transaction(function () use ($agent, $request) {
            $agent->update(['live_until' => null]);

            $agent->statusEvents()->create([
                'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return response()->json($this->buildStateResponse($agent->fresh()));
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Register or update a Web Push subscription for this agent's browser.
     */
    public function subscribe(Request $request, string $token): JsonResponse
    {
        $agent = $this->resolveAgentFromToken($token);

        if (! $agent) {
            abort(404);
        }

        if ($agent->status === Agent::STATUS_DISABLED) {
            return response()->json(['message' => 'Your account has been disabled.'], 422);
        }

        $validated = $request->validate([
            'endpoint' => 'required|url|max:2048',
            'p256dh_key' => 'required|string|max:200',
            'auth_key' => 'required|string|max:50',
            'user_agent' => 'nullable|string|max:255',
        ]);

        PushSubscription::updateOrCreate(
            ['agent_id' => $agent->id, 'endpoint' => $validated['endpoint']],
            [
                'p256dh_key' => $validated['p256dh_key'],
                'auth_key' => $validated['auth_key'],
                'user_agent' => $validated['user_agent'] ?? null,
                'is_active' => true,
                'last_used_at' => now(),
                'failed_at' => null,
            ]
        );

        return response()->json(['ok' => true]);
    }

    /**
     * Deactivate a Web Push subscription for this agent's browser.
     */
    public function unsubscribe(Request $request, string $token): JsonResponse
    {
        $agent = $this->resolveAgentFromToken($token);

        if (! $agent) {
            abort(404);
        }

        if ($agent->status === Agent::STATUS_DISABLED) {
            return response()->json(['message' => 'Your account has been disabled.'], 422);
        }

        $validated = $request->validate([
            'endpoint' => 'required|url|max:2048',
        ]);

        PushSubscription::where('agent_id', $agent->id)
            ->where('endpoint', $validated['endpoint'])
            ->update(['is_active' => false]);

        return response()->json(['ok' => true]);
    }

    // -------------------------------------------------------------------------

    /**
     * Build the full state response payload for a given agent.
     * Used by state(), goOnline(), extend(), and goOffline() to return
     * a consistent shape after every operation.
     */
    /**
     * Agent self-service update of their withdrawal settings.
     * Agents may change: accepts_withdrawals (mode) and withdrawal_max.
     * Agents may NOT change withdrawal_id — that is admin-only.
     * Max is clamped to [global_min, global_max_default]; the agent can lower
     * it any time (e.g. running out of cash) but not exceed the admin ceiling.
     */
    public function updateWithdrawal(Request $request, string $token): JsonResponse
    {
        $agent = $this->resolveAgentFromToken($token);

        if (! $agent) {
            abort(404);
        }

        if ($agent->status === Agent::STATUS_DISABLED) {
            return response()->json(['message' => 'Your account has been disabled.'], 422);
        }

        $min = (int) (\App\Models\Setting::where('key', 'withdrawal_min')->value('value') ?? 200);
        $maxCeiling = (int) (\App\Models\Setting::where('key', 'withdrawal_max_default')->value('value') ?? 10000);

        $validated = $request->validate([
            'accepts_withdrawals' => ['required', 'boolean'],
            'withdrawal_max' => ['nullable', 'numeric', 'min:0'],
        ]);

        $acceptsWithdrawals = (bool) $validated['accepts_withdrawals'];
        $max = $validated['withdrawal_max'] ?? null;

        // Clamp the max into the admin-allowed range when withdrawals are on.
        if ($acceptsWithdrawals) {
            if ($max === null) {
                $max = $agent->withdrawal_max ?? $maxCeiling;
            }
            $max = max($min, min((float) $max, $maxCeiling));
        }

        $agent->update([
            'accepts_withdrawals' => $acceptsWithdrawals,
            'withdrawal_max' => $acceptsWithdrawals ? $max : $agent->withdrawal_max,
        ]);

        return response()->json($this->buildStateResponse($agent->fresh()));
    }

    private function buildStateResponse(Agent $agent): array
    {
        return [
            'agent' => [
                'display_number' => $agent->display_number,
                'telegram_username' => $agent->telegram_username,
                'is_disabled' => $agent->status === Agent::STATUS_DISABLED,
            ],
            'status' => [
                'is_live' => $agent->isLive(),
                'live_until' => $agent->live_until?->toIso8601String(),
                'total_duration_minutes' => $this->getCurrentSessionDurationMinutes($agent),
            ],
            'metrics' => $this->metrics->getTodayMetrics($agent),
            'recent_activity' => $this->metrics->getRecentActivity($agent, 5),
            'available_durations' => AllowedDuration::availableDurations(),
            'recommended_duration' => AllowedDuration::recommendedDuration(),
            'token_suffix' => substr($agent->activeToken?->token ?? '', -4),
            'withdrawal' => [
                'accepts_withdrawals' => (bool) $agent->accepts_withdrawals,
                'withdrawal_max' => $agent->withdrawal_max !== null ? (float) $agent->withdrawal_max : null,
                // Admin-managed, shown read-only to the agent.
                'withdrawal_id' => $agent->withdrawal_id,
                'global_min' => (int) (\App\Models\Setting::where('key', 'withdrawal_min')->value('value') ?? 200),
                'global_max_default' => (int) (\App\Models\Setting::where('key', 'withdrawal_max_default')->value('value') ?? 10000),
            ],
            'notices' => Notice::currentlyVisible(Notice::AUDIENCE_AGENT)->get()->map(fn (Notice $notice) => [
                'id' => $notice->id,
                'title' => $notice->title,
                'body' => $notice->body,
                'priority' => $notice->priority,
                'created_at' => $notice->created_at->toIso8601String(),
            ])->values(),
        ];
    }

    /**
     * Get the total duration of the current session for progress bar calculation.
     *
     * Returns the duration_minutes from the most recent went_online or extended
     * event, which represents the current session's total (since extend is
     * strict replacement).
     */
    private function getCurrentSessionDurationMinutes(Agent $agent): ?int
    {
        if (! $agent->isLive()) {
            return null;
        }

        $latestEvent = $agent->statusEvents()
            ->whereIn('event_type', [
                StatusEvent::EVENT_WENT_ONLINE,
                StatusEvent::EVENT_EXTENDED,
            ])
            ->orderBy('created_at', 'desc')
            ->first();

        return $latestEvent?->duration_minutes;
    }
}
