<?php

namespace App\Services;

use App\Models\Agent;
use Illuminate\Support\Collection;

/**
 * Deterministic weighted sampling without replacement.
 *
 * Same viewer and unchanged eligible pool => same agents (including across
 * refreshes). Rank adjusts selection probability, not online eligibility.
 * No personal identifiers, ranking details, or scores reach the embed API.
 */
class AgentRankSampler
{
    public const NORMAL_RANK = 5;

    public function weight(Agent $agent): float
    {
        return 0.5 + 0.1 * $agent->effectiveRank(); // Level 1: 0.60, Level 5: 1.00, Level 10: 1.50.
    }

    /** @return Collection<int, Agent> */
    public function sample(Collection $agents, int $limit, string $seed): Collection
    {
        return $agents->map(function (Agent $agent) use ($seed) {
            // 52 random-looking bits, keyed to the app, avoid identifying
            // viewers from observed agent selections.
            $hex = substr(hash_hmac('sha256', $seed.'|'.$agent->id, (string) config('app.key')), 0, 13);
            $u = (hexdec($hex) + 1) / 4503599627370497.0;
            return ['agent' => $agent, 'score' => -log($u) / $this->weight($agent)];
        })->sort(fn (array $a, array $b) => ($a['score'] <=> $b['score'])
            ?: ($a['agent']->id <=> $b['agent']->id))
            ->take(max(0, $limit))
            ->pluck('agent')
            ->values();
    }
}
