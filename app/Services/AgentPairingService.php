<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\PlayerAgentAssignment;
use App\Models\Setting;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Agent pairing ("pair rule"): each player only ever sees a small, stable set
 * of agents instead of the full list.
 *
 * Who the player is: a DEVICE id (random, generated in the browser) plus the
 * PLAYER ID auto-detected from the logged-in account. Every agent a player is
 * given is remembered under BOTH. On every request the two memories are read
 * together and written back to both (merge), so:
 *   - a new account on the same device gets the same agents (device memory);
 *   - the same account on another device gets the same agents (player memory);
 *   - logging in on a device copies that device's agents to the player ID.
 *
 * How agents are chosen (deposit and withdrawal alike):
 *   1. From the player's previous agents, take the ones that can serve this
 *      request right now. Order: most recently shown on the DEPOSIT list
 *      first (so the deposit agents stay the deposit agents, and are the first
 *      ones tried for withdrawals), then most recently shown anywhere.
 *   2. Only if fewer than the pair size qualify, add random agents the player
 *      has never had. They join the player's memory.
 * For withdrawals "can serve" means online, withdrawal-capable, pays out to
 * the chosen bank and covers the amount.
 *
 * Pair reset (admin switch + hours): once a player's pairing is older than the
 * reset interval, it is forgotten on their next visit and they get a fresh
 * random pair — agents they didn't have last time first, previous ones only if
 * not enough others are online.
 */
class AgentPairingService
{
    public const INTENT_DEPOSIT = 'deposit';

    public const INTENT_WITHDRAWAL = 'withdrawal';

    public const DEFAULT_SIZE = 2;

    public const MAX_SIZE = 5;

    public const DEFAULT_RESET_HOURS = 72;

    public const MAX_RESET_HOURS = 720;

    public function isEnabled(): bool
    {
        return filter_var($this->setting('pair_mode_enabled', false), FILTER_VALIDATE_BOOLEAN);
    }

    /** Reset interval in hours, or null when the pair reset is switched off. */
    public function resetHours(): ?int
    {
        if (! filter_var($this->setting('pair_reset_enabled', false), FILTER_VALIDATE_BOOLEAN)) {
            return null;
        }

        $hours = (int) $this->setting('pair_reset_hours', self::DEFAULT_RESET_HOURS);

        return max(1, min(self::MAX_RESET_HOURS, $hours ?: self::DEFAULT_RESET_HOURS));
    }

    public function pairSize(): int
    {
        $size = (int) $this->setting('pair_size', self::DEFAULT_SIZE);

        return max(1, min(self::MAX_SIZE, $size ?: self::DEFAULT_SIZE));
    }

    /**
     * Choose the agents to show this player for this request, and remember
     * them. "partial" is true when none of the returned agents covers the
     * full withdrawal amount (the "closest" fallback).
     *
     * @return array{agents: Collection<int, Agent>, partial: bool}
     */
    public function choose(
        string $deviceId,
        string $playerId,
        string $intent,
        ?float $amount = null,
        ?string $bank = null,
    ): array {
        $deviceId = $this->normalizeKey($deviceId);
        $playerId = $this->normalizeKey($playerId);

        return $this->withLock($deviceId, function () use ($deviceId, $playerId, $intent, $amount, $bank) {
            $now = now();
            $size = $this->pairSize();
            $memory = $this->loadMemory($deviceId, $playerId);

            // Pair reset: the pairing is older than the admin's interval —
            // forget it (device + player ID) and start a fresh pair, trying
            // agents they didn't have last time first.
            $avoid = [];
            $resetHours = $this->resetHours();
            if ($resetHours !== null && $memory !== []
                && $this->pairingStartedAt($memory)->lte($now->copy()->subHours($resetHours))) {
                $avoid = array_keys($memory);
                $this->forget($deviceId, $playerId);
                $memory = [];
            }

            $live = Agent::query()
                ->where('status', Agent::STATUS_ACTIVE)
                ->where('live_until', '>', $now)
                ->with(['paymentMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order')])
                ->with(['withdrawalMethods' => fn ($q) => $q->select('payment_methods.id', 'slug', 'display_name')->orderBy('display_order')])
                ->get();

            $partial = false;
            $viewerSeed = $deviceId.'|'.$playerId;

            if ($intent === self::INTENT_WITHDRAWAL) {
                $withdrawers = $live->filter(fn (Agent $a) => $a->canWithdraw() && $this->paysToBank($a, $bank));
                $eligible = $withdrawers->filter(fn (Agent $a) => $a->coversWithdrawal((float) $amount));
                $chosen = $this->pick($eligible, $memory, $size, $avoid, $viewerSeed);

                if ($chosen->isEmpty() && $this->setting('withdrawal_no_match_behavior', 'closest') === 'closest') {
                    // Nobody can pay the full amount: show the highest-capacity
                    // agents instead (same as the classic list), previous
                    // agents first.
                    $chosen = $this->closest($withdrawers, $memory, $size);
                    $partial = $chosen->isNotEmpty();
                }
            } else {
                $chosen = $this->pick($live, $memory, $size, $avoid, $viewerSeed);
            }

            $this->remember($deviceId, $playerId, $memory, $chosen, $now, $intent);

            return ['agents' => $chosen->values(), 'partial' => $partial];
        });
    }

    /**
     * Link a device and a player ID (called when the widget detects a login):
     * both memories are merged and written back to both. Nothing is shown, so
     * no agent's last-shown time changes.
     */
    public function sync(string $deviceId, string $playerId): int
    {
        $deviceId = $this->normalizeKey($deviceId);
        $playerId = $this->normalizeKey($playerId);

        return $this->withLock($deviceId, function () use ($deviceId, $playerId) {
            $memory = $this->loadMemory($deviceId, $playerId);
            $this->remember($deviceId, $playerId, $memory, collect(), now(), null);

            return count($memory);
        });
    }

    // ------------------------------------------------------------------

    /**
     * Previous agents that can serve the request first (most recently shown
     * first), then random never-given agents to fill the remaining slots.
     * After a pair reset, $avoid holds the agents of the forgotten pairing:
     * they are only used when not enough other agents are online.
     *
     * @param  Collection<int, Agent>  $eligible
     * @param  array<int, array{first: CarbonInterface, last: ?CarbonInterface, dep: ?CarbonInterface}>  $memory
     * @param  int[]  $avoid
     * @return Collection<int, Agent>
     */
    private function pick(Collection $eligible, array $memory, int $size, array $avoid = [], string $viewerSeed = ''): Collection
    {
        $byId = $eligible->keyBy('id');

        $previous = collect($this->rankMemory($memory))
            ->filter(fn (int $id) => $byId->has($id))
            ->take($size)
            ->map(fn (int $id) => $byId->get($id));

        if ($previous->count() >= $size) {
            return $previous->values();
        }

        $fresh = $eligible->reject(fn (Agent $a) => isset($memory[$a->id]));
        $sampler = app(AgentRankSampler::class);
        $newPool = $fresh->reject(fn (Agent $a) => in_array($a->id, $avoid, true));
        $reusedPool = $fresh->filter(fn (Agent $a) => in_array($a->id, $avoid, true));
        // A returning player's eligible historical pair always wins. Agent
        // ranks only influence NEW assignments when spare slots remain.
        $new = $sampler->sample($newPool, $size, $viewerSeed.'|fresh');
        $reused = $sampler->sample($reusedPool, $size, $viewerSeed.'|reuse');

        return $previous
            ->concat($new->concat($reused)->take($size - $previous->count()))
            ->values();
    }

    /**
     * Withdrawal fallback when nobody covers the amount: highest capacity
     * first, previous agents before new ones.
     *
     * @param  Collection<int, Agent>  $withdrawers
     * @param  array<int, array{first: CarbonInterface, last: ?CarbonInterface, dep: ?CarbonInterface}>  $memory
     * @return Collection<int, Agent>
     */
    private function closest(Collection $withdrawers, array $memory, int $size): Collection
    {
        $byMax = fn (Agent $a, Agent $b) => (float) $b->withdrawal_max <=> (float) $a->withdrawal_max;

        $previous = $withdrawers->filter(fn (Agent $a) => isset($memory[$a->id]))->sort($byMax);
        $others = $withdrawers->reject(fn (Agent $a) => isset($memory[$a->id]))->sort($byMax);

        return $previous->concat($others)->take($size)->values();
    }

    /**
     * Agent ids from memory in preference order: most recently shown on the
     * deposit list first, then most recently shown anywhere (never-shown
     * entries count from when they were given). Ties fall back to oldest
     * assignment, then id, so the order is deterministic.
     *
     * @param  array<int, array{first: CarbonInterface, last: ?CarbonInterface, dep: ?CarbonInterface}>  $memory
     * @return int[]
     */
    private function rankMemory(array $memory): array
    {
        $ids = array_keys($memory);

        $key = fn (array $m) => [
            $m['dep']?->getTimestamp() ?? -1,
            ($m['last'] ?? $m['first'])->getTimestamp(),
        ];

        usort($ids, function (int $a, int $b) use ($memory, $key) {
            // Higher (more recent) keys first...
            $cmp = $key($memory[$b]) <=> $key($memory[$a]);
            if ($cmp !== 0) {
                return $cmp;
            }

            // ...then the oldest assignment, then the lowest id.
            return [$memory[$a]['first']->getTimestamp(), $a]
                <=> [$memory[$b]['first']->getTimestamp(), $b];
        });

        return $ids;
    }

    /**
     * Union of the device's and the player's memories, per agent: earliest
     * first-assigned time and latest last-shown / last-deposit-shown times.
     *
     * @return array<int, array{first: CarbonInterface, last: ?CarbonInterface, dep: ?CarbonInterface}>
     */
    private function loadMemory(string $deviceId, string $playerId): array
    {
        $rows = PlayerAgentAssignment::query()
            ->where(fn ($q) => $q->where('subject_type', PlayerAgentAssignment::SUBJECT_DEVICE)->where('subject_key', $deviceId))
            ->orWhere(fn ($q) => $q->where('subject_type', PlayerAgentAssignment::SUBJECT_PLAYER)->where('subject_key', $playerId))
            ->get();

        $memory = [];
        foreach ($rows as $row) {
            $id = (int) $row->agent_id;
            if (! isset($memory[$id])) {
                $memory[$id] = [
                    'first' => $row->first_assigned_at,
                    'last' => $row->last_shown_at,
                    'dep' => $row->last_deposit_shown_at,
                ];

                continue;
            }
            if ($row->first_assigned_at->lt($memory[$id]['first'])) {
                $memory[$id]['first'] = $row->first_assigned_at;
            }
            $memory[$id]['last'] = $this->latest($memory[$id]['last'], $row->last_shown_at);
            $memory[$id]['dep'] = $this->latest($memory[$id]['dep'], $row->last_deposit_shown_at);
        }

        return $memory;
    }

    /**
     * When the current pairing started: the earliest time any of these agents
     * was given to this device / player.
     *
     * @param  array<int, array{first: CarbonInterface, last: ?CarbonInterface, dep: ?CarbonInterface}>  $memory
     */
    private function pairingStartedAt(array $memory): CarbonInterface
    {
        $firsts = array_map(fn (array $m) => $m['first'], $memory);
        usort($firsts, fn (CarbonInterface $a, CarbonInterface $b) => $a <=> $b);

        return $firsts[0];
    }

    /** Forget every agent remembered for this device and this player ID. */
    private function forget(string $deviceId, string $playerId): void
    {
        PlayerAgentAssignment::query()
            ->where(fn ($q) => $q->where('subject_type', PlayerAgentAssignment::SUBJECT_DEVICE)->where('subject_key', $deviceId))
            ->orWhere(fn ($q) => $q->where('subject_type', PlayerAgentAssignment::SUBJECT_PLAYER)->where('subject_key', $playerId))
            ->delete();
    }

    private function latest(?CarbonInterface $a, ?CarbonInterface $b): ?CarbonInterface
    {
        if ($a === null) {
            return $b;
        }
        if ($b === null) {
            return $a;
        }

        return $b->gt($a) ? $b : $a;
    }

    /**
     * Write the merged memory (plus the agents just shown) back to BOTH the
     * device and the player ID.
     *
     * @param  array<int, array{first: CarbonInterface, last: ?CarbonInterface, dep: ?CarbonInterface}>  $memory
     * @param  Collection<int, Agent>  $shown
     */
    private function remember(
        string $deviceId,
        string $playerId,
        array $memory,
        Collection $shown,
        CarbonInterface $now,
        ?string $intent,
    ): void {
        foreach ($shown as $agent) {
            $memory[$agent->id] = [
                'first' => $memory[$agent->id]['first'] ?? $now,
                'last' => $now,
                'dep' => $intent === self::INTENT_DEPOSIT ? $now : ($memory[$agent->id]['dep'] ?? null),
            ];
        }

        if ($memory === []) {
            return;
        }

        $rows = [];
        foreach ($memory as $agentId => $entry) {
            foreach ([
                PlayerAgentAssignment::SUBJECT_DEVICE => $deviceId,
                PlayerAgentAssignment::SUBJECT_PLAYER => $playerId,
            ] as $type => $key) {
                $rows[] = [
                    'subject_type' => $type,
                    'subject_key' => $key,
                    'agent_id' => $agentId,
                    'first_assigned_at' => $entry['first'],
                    'last_shown_at' => $entry['last'],
                    'last_deposit_shown_at' => $entry['dep'],
                ];
            }
        }

        PlayerAgentAssignment::upsert(
            $rows,
            ['subject_type', 'subject_key', 'agent_id'],
            ['first_assigned_at', 'last_shown_at', 'last_deposit_shown_at'],
        );
    }

    /** Same normalisation as the widget's bank matching (case/space/_/- insensitive). */
    private function paysToBank(Agent $agent, ?string $bank): bool
    {
        $want = $this->normalizeBank($bank ?? '');
        if ($want === '') {
            return true;
        }

        return $agent->withdrawalMethods->contains(
            fn ($m) => $this->normalizeBank((string) $m->display_name) === $want
                || $this->normalizeBank((string) $m->slug) === $want
        );
    }

    private function normalizeBank(string $s): string
    {
        return (string) preg_replace('/[\s_-]+/', '', mb_strtolower($s));
    }

    private function normalizeKey(string $key): string
    {
        return mb_strtolower(trim($key));
    }

    /**
     * Serialise choose/sync per device so a double tap can't hand out two
     * different sets of new agents at once. If the lock can't be taken in
     * time we carry on without it rather than fail the player.
     */
    private function withLock(string $deviceId, callable $callback): mixed
    {
        try {
            return Cache::lock('agent-pair:'.sha1($deviceId), 10)->block(5, $callback);
        } catch (LockTimeoutException) {
            return $callback();
        }
    }

    private function setting(string $key, mixed $default): mixed
    {
        $value = Setting::where('key', $key)->value('value');

        return $value ?? $default;
    }
}
