<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\Setting;
use App\Models\StatusEvent;
use App\Models\VisitEvent;
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

        $settings = Setting::whereIn('key', [
            'prefill_message',
            'deposit_prefill_message',
            'deposit_quick_amounts',
            'deposit_message',
            'player_id_storage_key',
            'player_id_dom_selector',
            'show_offline_agents',
            'shuffle_live_agents',
            'onboarding_video_url',
            'withdrawals_enabled',
            'withdrawal_min',
            'withdrawal_quick_amounts',
            'withdrawal_redirect_path',
            'withdrawal_howto_video_url',
            'deposit_howto_video_url',
            'withdrawal_no_match_behavior',
            'withdrawal_bank_options',
            'withdrawal_require_payout_details',
            'withdrawal_message_with_amount',
            'withdrawal_message_no_amount',
            'recents_enabled',
            'recents_count',
        ])->pluck('value', 'key');

        // deposit_prefill_message supersedes the legacy prefill_message key.
        $prefillMessage = $settings['deposit_prefill_message']
            ?? $settings['prefill_message']
            ?? 'Hi Kemerbet agent, I want to deposit';
        $showOffline = filter_var($settings['show_offline_agents'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $shuffleLive = filter_var($settings['shuffle_live_agents'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $withdrawalsEnabled = filter_var($settings['withdrawals_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);

        $agents = Agent::where('status', Agent::STATUS_ACTIVE)
            ->with(['paymentMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order')])
            ->with(['withdrawalMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order')])
            ->addSelect(['agents.*',
                'last_offline_at' => StatusEvent::select('created_at')
                    ->whereColumn('agent_id', 'agents.id')
                    ->whereIn('event_type', [StatusEvent::EVENT_WENT_OFFLINE, StatusEvent::EVENT_SESSION_EXPIRED])
                    ->latest('created_at')
                    ->limit(1),
            ])
            ->get();

        // Pinned agents render at the top of the live section, oldest pin
        // first; unpinned agents keep display_number order.
        [$pinnedLive, $unpinnedLive] = $agents
            ->filter(fn (Agent $a) => $a->live_until && $a->live_until->gt($now))
            ->partition(fn (Agent $a) => $a->pinned_at !== null);

        $live = $pinnedLive->sortBy('pinned_at')
            ->concat($unpinnedLive->sortBy('display_number'))
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

        // Compact directory of every active agent, so the widget can resolve a
        // player's stored "recent agents" even when the agent isn't in the
        // current live/offline list. Cheap: a few dozen small rows.
        $directory = $agents->map(function (Agent $a) use ($now) {
            return [
                'id' => $a->id,
                'display_number' => $a->display_number,
                'telegram_username' => $a->telegram_username,
                'online' => $a->live_until && $a->live_until->gt($now),
                'accepts_withdrawals' => $a->canWithdraw(),
                'withdrawal_max' => $a->canWithdraw() ? (float) $a->withdrawal_max : null,
                'has_withdrawal_id' => $a->withdrawal_id !== null && $a->withdrawal_id !== '',
            ];
        })->values()->all();

        $quickAmounts = $settings['withdrawal_quick_amounts']
            ?? [200, 500, 1000, 3000, 5000, 10000, 25000, 50000, 100000];

        return [
            'cached_at' => $now->toIso8601String(),
            'live_count' => $live->count(),
            'agents' => $result,
            'directory' => $directory,
            'notices' => \App\Models\Notice::currentlyVisible(\App\Models\Notice::AUDIENCE_PLAYER)
                ->get()
                ->map(fn (\App\Models\Notice $n) => [
                    'id' => $n->id,
                    'title' => $n->title,
                    'body' => $n->body,
                    'priority' => $n->priority,
                    'video_url' => $n->video_url,
                ])->values()->all(),
            'settings' => [
                'chat_prefilled_message' => $prefillMessage,
                'show_offline_agents' => $showOffline,
                'shuffle_live_agents' => $shuffleLive,
                'onboarding_video_url' => $settings['onboarding_video_url'] ?? '',
                'withdrawals_enabled' => $withdrawalsEnabled,
                'withdrawal_min' => (int) ($settings['withdrawal_min'] ?? 200),
                'withdrawal_quick_amounts' => array_values(array_map('intval', $quickAmounts)),
                'withdrawal_redirect_path' => $settings['withdrawal_redirect_path'] ?? '/sport/popup/withdrawal',
                'deposit_howto_video_url' => (string) ($settings['deposit_howto_video_url'] ?? ''),
                'withdrawal_howto_video_url' => $settings['withdrawal_howto_video_url'] ?? '',
                'withdrawal_no_match_behavior' => $settings['withdrawal_no_match_behavior'] ?? 'closest',
                'withdrawal_bank_options' => array_values(array_filter(array_map(
                    'strval',
                    is_array($settings['withdrawal_bank_options'] ?? null) ? $settings['withdrawal_bank_options'] : []
                ))),
                'withdrawal_require_payout_details' => filter_var(
                    $settings['withdrawal_require_payout_details'] ?? true,
                    FILTER_VALIDATE_BOOLEAN
                ),
                'withdrawal_message_with_amount' => $settings['withdrawal_message_with_amount']
                    ?? 'Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw {amount} ETB. I will share my withdrawal code shortly.',
                'deposit_quick_amounts' => array_values(array_map('intval',
                    is_array($settings['deposit_quick_amounts'] ?? null) ? $settings['deposit_quick_amounts'] : [200, 300, 500, 1000, 2000, 5000, 10000]
                )),
                'player_id_storage_key' => (string) ($settings['player_id_storage_key'] ?? ''),
                'player_id_dom_selector' => (string) ($settings['player_id_dom_selector'] ?? ''),
                'deposit_message' => $settings['deposit_message']
                    ?? "Hi Kemerbet agent, I want to deposit {amount} ETB.\nMy Player ID: {player_id}",
                'withdrawal_message_no_amount' => $settings['withdrawal_message_no_amount']
                    ?? 'Hi dear agent, to your Withdrawal ID {withdrawal_id} I want to withdraw — I will share the amount and my withdrawal code shortly.',
                'recents_enabled' => filter_var($settings['recents_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN),
                'recents_count' => (int) ($settings['recents_count'] ?? 5),
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
            'payment_methods' => 'nullable|array|max:10',
            'payment_methods.*' => 'string|max:50',
            'intent' => 'nullable|string|in:deposit,withdrawal,contact',
            'amount' => 'nullable|numeric|min:0|max:100000000',
            'source' => 'nullable|string|in:list,recent,intent',
        ]);

        $intent = $request->input('intent', 'deposit');

        ClickEvent::create([
            'agent_id' => $agentModel->id,
            // click_type retained for backward compatibility with existing
            // analytics; intent is the richer field going forward.
            'click_type' => $intent === 'contact' ? 'contact' : 'deposit',
            'intent' => $intent,
            // Amount only meaningful for withdrawals.
            'amount' => $intent === 'withdrawal' ? $request->input('amount') : null,
            'source' => $request->input('source'),
            'visitor_id' => hash('xxh3', config('app.key').$request->ip().$request->userAgent()),
            'ip_address' => $request->ip(),
            'referrer' => $request->input('referrer'),
            'payment_methods' => $request->input('payment_methods'),
            'created_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function visit(Request $request): JsonResponse
    {
        $request->validate([
            'referrer' => 'nullable|string|max:2000',
        ]);

        VisitEvent::create([
            'visitor_id' => hash('xxh3', config('app.key').$request->ip().$request->userAgent()),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'referrer' => $request->input('referrer'),
            'created_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    private function transformAgent(Agent $agent, string $status): array
    {
        $canWithdraw = $agent->canWithdraw();

        $data = [
            'id' => $agent->id,
            'display_number' => $agent->display_number,
            'telegram_username' => $agent->telegram_username,
            'status' => $status,
            'is_pinned' => $agent->pinned_at !== null,
            'accepts_withdrawals' => $canWithdraw,
            'withdrawal_max' => $canWithdraw ? (float) $agent->withdrawal_max : null,
            // withdrawal_id is needed client-side only to build the auto-message;
            // exposed only for withdrawal-capable agents.
            'withdrawal_id' => $canWithdraw ? $agent->withdrawal_id : null,
            'payment_methods' => $agent->paymentMethods->map(fn ($pm) => [
                'slug' => $pm->slug,
                'display_name' => $pm->display_name,
            ])->values()->all(),
            // Banks this agent pays OUT to (withdrawals) — only meaningful when
            // withdrawal-capable; used to match the player's chosen bank.
            'withdrawal_methods' => $canWithdraw
                ? $agent->withdrawalMethods->map(fn ($pm) => [
                    'slug' => $pm->slug,
                    'display_name' => $pm->display_name,
                ])->values()->all()
                : [],
        ];

        if ($status === 'recently_offline') {
            $data['last_seen_at'] = $agent->last_offline_at instanceof \DateTimeInterface
                ? $agent->last_offline_at->toIso8601String()
                : (string) $agent->last_offline_at;
        }

        return $data;
    }
}
