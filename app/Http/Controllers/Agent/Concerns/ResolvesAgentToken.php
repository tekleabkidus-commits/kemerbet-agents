<?php

namespace App\Http\Controllers\Agent\Concerns;

use App\Models\Agent;
use App\Models\AgentToken;

/**
 * Shared token resolution for agent secret page endpoints.
 *
 * Lookup: find AgentToken by value where not revoked → load agent (non-deleted).
 * Updates last_used_at on the token as a side effect.
 *
 * Returns null on failure — callers decide how to handle:
 *   - Blade route: render error view
 *   - API routes: abort(404)
 */
trait ResolvesAgentToken
{
    /**
     * Resolve an Agent from a raw token string.
     *
     * Returns null if:
     *   - No token record found
     *   - Token is revoked (revoked_at not null)
     *   - Agent is soft-deleted
     *
     * Side effects:
     *   - Updates last_used_at on the token
     */
    private function resolveAgentFromToken(string $token): ?Agent
    {
        $agentToken = AgentToken::where('token', $token)
            ->whereNull('revoked_at')
            ->first();

        if (! $agentToken) {
            return null;
        }

        $agent = Agent::find($agentToken->agent_id);

        if (! $agent) {
            return null;
        }

        $agentToken->update(['last_used_at' => now()]);

        return $agent;
    }
}
