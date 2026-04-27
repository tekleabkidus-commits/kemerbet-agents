<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListAgentsRequest;
use App\Http\Requests\Admin\UpdateAgentRequest;
use App\Models\Agent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class AgentController extends Controller
{
    public function index(ListAgentsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $status = $validated['status'] ?? 'all';
        $search = $validated['search'] ?? null;
        $paymentSlug = $validated['payment_method'] ?? null;
        $sort = $validated['sort'] ?? 'number';
        $perPage = $validated['per_page'] ?? 20;

        $query = Agent::with(['paymentMethods' => function ($q) {
            $q->select('payment_methods.id', 'slug', 'display_name')
                ->orderBy('display_order');
        }]);

        if ($status === 'deleted') {
            $query->onlyTrashed();
        } else {
            match ($status) {
                'live' => $query->where('status', Agent::STATUS_ACTIVE)
                    ->where('live_until', '>', now()),
                'offline' => $query->where('status', Agent::STATUS_ACTIVE)
                    ->where(function ($q) {
                        $q->whereNull('live_until')
                            ->orWhere('live_until', '<=', now());
                    }),
                'disabled' => $query->where('status', Agent::STATUS_DISABLED),
                default => null,
            };
        }

        if ($search !== null && $search !== '') {
            $query->where(function ($q) use ($search) {
                // TODO: At scale (~500+ agents), replace LIKE on cast(display_number AS text)
                // with a generated column + trigram index. Fine for current scale.
                $q->whereRaw('CAST(display_number AS text) LIKE ?', ["%{$search}%"])
                    ->orWhere('telegram_username', 'ILIKE', "%{$search}%");
            });
        }

        if ($paymentSlug !== null && $paymentSlug !== '') {
            $query->whereHas('paymentMethods', function ($q) use ($paymentSlug) {
                $q->where('slug', $paymentSlug);
            });
        }

        match ($sort) {
            'last_seen' => $query->orderByRaw('last_status_change_at DESC NULLS LAST'),
            default => $query->orderBy('display_number', 'asc'),
        };

        $paginator = $query->paginate($perPage);

        $now = now();

        $data = $paginator->getCollection()->map(function (Agent $agent) use ($now) {
            $computedStatus = $this->computeStatus($agent, $now);
            $secondsRemaining = null;

            if ($computedStatus === 'live' && $agent->live_until !== null) {
                $secondsRemaining = max(0, $now->diffInSeconds($agent->live_until, false));
            }

            return [
                'id' => $agent->id,
                'display_number' => $agent->display_number,
                'telegram_username' => $agent->telegram_username,
                'status' => $agent->status,
                'computed_status' => $computedStatus,
                'live_until' => $agent->live_until?->toIso8601String(),
                'seconds_remaining' => $secondsRemaining,
                'last_status_change_at' => $agent->last_status_change_at?->toIso8601String(),
                'payment_methods' => $agent->paymentMethods->map(fn ($pm) => [
                    'id' => $pm->id,
                    'slug' => $pm->slug,
                    'display_name' => $pm->display_name,
                ]),
                'notes' => $agent->notes,
                'clicks_today' => 0, // TODO: Phase F — wire to click_events aggregate
                'clicks_total' => 0, // TODO: Phase F — wire to daily_stats + click_events
                'created_at' => $agent->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(Agent $agent): JsonResponse
    {
        return $this->respondWithDetail($agent);
    }

    public function update(UpdateAgentRequest $request, Agent $agent): JsonResponse
    {
        $validated = $request->validated();

        $agent->update(Arr::only($validated, ['telegram_username', 'notes']));

        if (isset($validated['payment_method_ids'])) {
            $agent->paymentMethods()->sync($validated['payment_method_ids']);
        }

        return $this->respondWithDetail($agent->fresh());
    }

    public function disable(Request $request, Agent $agent): JsonResponse
    {
        if ($agent->status === Agent::STATUS_DISABLED) {
            return $this->respondWithDetail($agent);
        }

        $agent->update([
            'status' => Agent::STATUS_DISABLED,
            'live_until' => null,
            'last_status_change_at' => now(),
        ]);

        $agent->statusEvents()->create([
            'admin_id' => $request->user()->id,
            'event_type' => 'disabled_by_admin',
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return $this->respondWithDetail($agent->fresh());
    }

    public function enable(Request $request, Agent $agent): JsonResponse
    {
        if ($agent->status === Agent::STATUS_ACTIVE) {
            return $this->respondWithDetail($agent);
        }

        $agent->update([
            'status' => Agent::STATUS_ACTIVE,
            'last_status_change_at' => now(),
        ]);

        $agent->statusEvents()->create([
            'admin_id' => $request->user()->id,
            'event_type' => 'enabled_by_admin',
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return $this->respondWithDetail($agent->fresh());
    }

    public function regenerateToken(Request $request, Agent $agent): JsonResponse
    {
        DB::transaction(function () use ($request, $agent) {
            $agent->tokens()->whereNull('revoked_at')->update(['revoked_at' => now()]);

            $agent->tokens()->create([
                'token' => bin2hex(random_bytes(32)),
                'created_at' => now(),
            ]);

            $agent->update([
                'live_until' => null,
                'last_status_change_at' => now(),
            ]);

            $agent->statusEvents()->create([
                'admin_id' => $request->user()->id,
                'event_type' => 'token_regenerated',
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return $this->respondWithDetail($agent->fresh());
    }

    public function store(): never
    {
        throw new \BadMethodCallException('AgentController@store not implemented yet.');
    }

    public function destroy(Request $request, Agent $agent): JsonResponse
    {
        DB::transaction(function () use ($request, $agent) {
            $agent->tokens()->whereNull('revoked_at')->update(['revoked_at' => now()]);

            $agent->statusEvents()->create([
                'admin_id' => $request->user()->id,
                'event_type' => 'deleted_by_admin',
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);

            $agent->delete();
        });

        return $this->respondWithDetail($agent);
    }

    private function respondWithDetail(Agent $agent): JsonResponse
    {
        $agent->load([
            'paymentMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order'),
            'activeToken',
        ]);

        return response()->json([
            'data' => $this->formatAgentDetail($agent),
        ]);
    }

    /**
     * Builds the detail response shape for show() and update().
     * NOT used by index() — list rows don't need active_token_url or token timestamps.
     */
    private function formatAgentDetail(Agent $agent): array
    {
        $now = now();
        $computedStatus = $this->computeStatus($agent, $now);
        $secondsRemaining = null;

        if ($computedStatus === 'live' && $agent->live_until !== null) {
            $secondsRemaining = max(0, $now->diffInSeconds($agent->live_until, false));
        }

        $activeTokenUrl = null;
        if ($agent->activeToken) {
            $activeTokenUrl = config('app.url').'/a/'.$agent->activeToken->token;
        }

        return [
            'id' => $agent->id,
            'display_number' => $agent->display_number,
            'telegram_username' => $agent->telegram_username,
            'status' => $agent->status,
            'computed_status' => $computedStatus,
            'live_until' => $agent->live_until?->toIso8601String(),
            'seconds_remaining' => $secondsRemaining,
            'last_status_change_at' => $agent->last_status_change_at?->toIso8601String(),
            'payment_methods' => $agent->paymentMethods->map(fn ($pm) => [
                'id' => $pm->id,
                'slug' => $pm->slug,
                'display_name' => $pm->display_name,
            ]),
            'notes' => $agent->notes,
            'active_token_url' => $activeTokenUrl,
            'active_token_created_at' => $agent->activeToken?->created_at?->toIso8601String(),
            'active_token_last_used_at' => $agent->activeToken?->last_used_at?->toIso8601String(),
            'clicks_today' => 0, // TODO: Phase F — wire to click_events aggregate
            'clicks_total' => 0, // TODO: Phase F — wire to daily_stats + click_events
            'created_at' => $agent->created_at->toIso8601String(),
        ];
    }

    private function computeStatus(Agent $agent, \DateTimeInterface $now): string
    {
        if ($agent->status === Agent::STATUS_DISABLED) {
            return 'disabled';
        }

        if ($agent->live_until !== null && $agent->live_until > $now) {
            return 'live';
        }

        return 'offline';
    }
}
