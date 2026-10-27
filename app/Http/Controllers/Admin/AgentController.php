<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateAgentRequest;
use App\Http\Requests\Admin\ListAgentsRequest;
use App\Http\Requests\Admin\UpdateAgentRequest;
use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\DailyStat;
use App\Models\StatusEvent;
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

        // Pinned agents that are currently live sort first (oldest pin on top),
        // then the user-selected sort applies to everyone else.
        $query->orderByRaw(
            'CASE WHEN pinned_at IS NOT NULL AND status = ? AND live_until > ? THEN 0 ELSE 1 END, '
            .'CASE WHEN pinned_at IS NOT NULL AND status = ? AND live_until > ? THEN pinned_at END ASC',
            [Agent::STATUS_ACTIVE, now(), Agent::STATUS_ACTIVE, now()]
        );

        match ($sort) {
            'last_seen' => $query->orderByRaw('last_status_change_at DESC NULLS LAST'),
            default => $query->orderBy('display_number', 'asc'),
        };

        $paginator = $query->paginate($perPage);

        $now = now();
        $agentIds = $paginator->getCollection()->pluck('id');

        $clicksToday = ClickEvent::whereIn('agent_id', $agentIds)
            ->where('click_type', 'deposit')
            ->where('created_at', '>=', $now->copy()->startOfDay())
            ->groupBy('agent_id')
            ->selectRaw('agent_id, COUNT(*) as count')
            ->pluck('count', 'agent_id');

        // daily_stats only holds fully rolled-up past days (02:00 rollup),
        // so today's clicks come from raw click_events on top of it.
        $rolledUpClicks = DailyStat::whereIn('agent_id', $agentIds)
            ->groupBy('agent_id')
            ->selectRaw('agent_id, SUM(deposit_clicks) as total')
            ->pluck('total', 'agent_id');

        $data = $paginator->getCollection()->map(function (Agent $agent) use ($now, $clicksToday, $rolledUpClicks) {
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
                'is_pinned' => $agent->pinned_at !== null,
                'pinned_at' => $agent->pinned_at?->toIso8601String(),
            'effective_rank' => $agent->effectiveRank(),
            'rank_override_level' => $agent->activeRankOverride() ? $agent->rank_override_level : null,
            'rank_override_expires_at' => $agent->activeRankOverride() ? $agent->rank_override_expires_at?->toIso8601String() : null,
                'effective_rank' => $agent->effectiveRank(),
                'rank_override_level' => $agent->activeRankOverride() ? $agent->rank_override_level : null,
                'rank_override_expires_at' => $agent->activeRankOverride() ? $agent->rank_override_expires_at?->toIso8601String() : null,
                'payment_methods' => $agent->paymentMethods->map(fn ($pm) => [
                    'id' => $pm->id,
                    'slug' => $pm->slug,
                    'display_name' => $pm->display_name,
                ]),
                'notes' => $agent->notes,
                'clicks_today' => (int) ($clicksToday->get($agent->id) ?? 0),
                'clicks_total' => (int) ($rolledUpClicks->get($agent->id) ?? 0)
                    + (int) ($clicksToday->get($agent->id) ?? 0),
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

        $agent->update(Arr::only($validated, [
            'display_number', 'telegram_username', 'notes',
            'accepts_withdrawals', 'withdrawal_id', 'withdrawal_max',
        ]));

        if (isset($validated['payment_method_ids'])) {
            $agent->paymentMethods()->sync($validated['payment_method_ids']);
        }

        if (isset($validated['withdrawal_method_ids'])) {
            $agent->withdrawalMethods()->sync($validated['withdrawal_method_ids']);
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
            'event_type' => StatusEvent::EVENT_DISABLED_BY_ADMIN,
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
            'event_type' => StatusEvent::EVENT_ENABLED_BY_ADMIN,
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return $this->respondWithDetail($agent->fresh());
    }

    public function pin(Request $request, Agent $agent): JsonResponse
    {
        if ($agent->pinned_at !== null) {
            $agent->update(['pinned_at' => null]);

            $agent->statusEvents()->create([
                'admin_id' => $request->user()->id,
                'event_type' => StatusEvent::EVENT_UNPINNED_BY_ADMIN,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);

            return $this->respondWithDetail($agent->fresh());
        }

        if ($this->computeStatus($agent, now()) !== 'live') {
            return response()->json(['message' => 'Agent must be online to pin'], 422);
        }

        $agent->update(['pinned_at' => now()]);

        $agent->statusEvents()->create([
            'admin_id' => $request->user()->id,
            'event_type' => StatusEvent::EVENT_PINNED_BY_ADMIN,
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
                'event_type' => StatusEvent::EVENT_TOKEN_REGENERATED,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return $this->respondWithDetail($agent->fresh());
    }

    public function store(CreateAgentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $agent = DB::transaction(function () use ($request, $validated) {
            $nextNumber = (Agent::withTrashed()->max('display_number') ?? 0) + 1;

            $agent = Agent::create([
                'display_number' => $nextNumber,
                'telegram_username' => $validated['telegram_username'],
                'notes' => $validated['notes'] ?? null,
                'status' => Agent::STATUS_ACTIVE,
                'live_until' => null,
                'last_status_change_at' => now(),
            ]);

            $agent->paymentMethods()->sync($validated['payment_method_ids']);

            $agent->tokens()->create([
                'token' => bin2hex(random_bytes(32)),
                'created_at' => now(),
            ]);

            $agent->statusEvents()->create([
                'admin_id' => $request->user()->id,
                'event_type' => StatusEvent::EVENT_CREATED_BY_ADMIN,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);

            return $agent;
        });

        return $this->respondWithDetail($agent->fresh())
            ->setStatusCode(201);
    }

    public function destroy(Request $request, Agent $agent): JsonResponse
    {
        DB::transaction(function () use ($request, $agent) {
            $agent->tokens()->whereNull('revoked_at')->update(['revoked_at' => now()]);

            $agent->statusEvents()->create([
                'admin_id' => $request->user()->id,
                'event_type' => StatusEvent::EVENT_DELETED_BY_ADMIN,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);

            $agent->delete();
        });

        return $this->respondWithDetail($agent);
    }

    public function restore(Request $request, Agent $agent): JsonResponse
    {
        if (! $agent->trashed()) {
            return response()->json(['message' => 'Agent is not deleted.'], 422);
        }

        DB::transaction(function () use ($request, $agent) {
            // Assign new display_number BEFORE restoring to avoid unique constraint
            // collision — the partial index (WHERE deleted_at IS NULL) means the old
            // display_number could conflict with an active agent once deleted_at is cleared.
            $nextNumber = (Agent::withTrashed()->max('display_number') ?? 0) + 1;

            $agent->update([
                'display_number' => $nextNumber,
                'status' => Agent::STATUS_DISABLED,
                'live_until' => null,
                'last_status_change_at' => now(),
            ]);

            $agent->restore();

            // SECURITY NOTE: Per design decision, restore reactivates the agent's most recent
            // token rather than generating a new one. This means previously-distributed URLs
            // (potentially shared in customer chats, screenshots, etc.) become functional again.
            // Admin accepts this tradeoff as documented in PROJECT_STATE.md Task 5 design.
            $latestToken = $agent->tokens()->orderBy('created_at', 'desc')->orderBy('id', 'desc')->first();
            if ($latestToken) {
                $latestToken->update(['revoked_at' => null]);
            } else {
                $agent->tokens()->create([
                    'token' => bin2hex(random_bytes(32)),
                    'created_at' => now(),
                ]);
            }

            $agent->statusEvents()->create([
                'admin_id' => $request->user()->id,
                'event_type' => StatusEvent::EVENT_RESTORED_BY_ADMIN,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return $this->respondWithDetail($agent->fresh());
    }

    private function respondWithDetail(Agent $agent): JsonResponse
    {
        $agent->load([
            'paymentMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order'),
            'withdrawalMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order'),
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
            'is_pinned' => $agent->pinned_at !== null,
            'pinned_at' => $agent->pinned_at?->toIso8601String(),
            'payment_methods' => $agent->paymentMethods->map(fn ($pm) => [
                'id' => $pm->id,
                'slug' => $pm->slug,
                'display_name' => $pm->display_name,
            ]),
            'notes' => $agent->notes,
            'accepts_withdrawals' => (bool) $agent->accepts_withdrawals,
            'withdrawal_id' => $agent->withdrawal_id,
            'withdrawal_max' => $agent->withdrawal_max !== null ? (float) $agent->withdrawal_max : null,
            'withdrawal_methods' => $agent->withdrawalMethods->map(fn ($pm) => [
                'id' => $pm->id,
                'slug' => $pm->slug,
                'display_name' => $pm->display_name,
            ]),
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
