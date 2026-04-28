<?php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Agent\Concerns\ResolvesAgentToken;
use App\Http\Controllers\Controller;
use App\Models\Agent;
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
     * Build the full state response payload for a given agent.
     * Used by state(), goOnline(), extend(), and goOffline() to return
     * a consistent shape after every operation.
     */
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
