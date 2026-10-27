<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class AgentRankController extends Controller
{
    public function store(Request $request, Agent $agent): JsonResponse
    {
        $data = $request->validate([
            'level' => ['required', 'integer', 'min:1', 'max:10', 'not_in:5'],
            'expires_at' => ['required', 'date', 'after:now', 'before_or_equal:'.now()->addDays(30)->toIso8601String()],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $agent = DB::transaction(function () use ($request, $agent, $data) {
            $locked = Agent::query()->whereKey($agent->id)->lockForUpdate()->firstOrFail();
            $previous = $locked->effectiveRank();
            $locked->update([
                'rank_override_level' => (int) $data['level'],
                'rank_override_expires_at' => Carbon::parse($data['expires_at'])->utc(),
            ]);
            DB::table('agent_rank_audits')->insert([
                'agent_id' => $locked->id,
                'admin_id' => $request->user()->id,
                'action' => 'override',
                'previous_level' => $previous,
                'new_level' => (int) $data['level'],
                'expires_at' => $locked->rank_override_expires_at,
                'reason' => trim($data['reason']),
                'created_at' => now(),
            ]);
            return $locked->fresh();
        });

        Cache::forget('public_agents');

        return response()->json(['data' => $this->fields($agent)]);
    }

    public function destroy(Request $request, Agent $agent): JsonResponse
    {
        $agent = DB::transaction(function () use ($request, $agent) {
            $locked = Agent::query()->whereKey($agent->id)->lockForUpdate()->firstOrFail();
            $previous = $locked->effectiveRank();
            $locked->update(['rank_override_level' => null, 'rank_override_expires_at' => null]);
            DB::table('agent_rank_audits')->insert([
                'agent_id' => $locked->id,
                'admin_id' => $request->user()->id,
                'action' => 'reset',
                'previous_level' => $previous,
                'new_level' => Agent::DEFAULT_RANK,
                'expires_at' => null,
                'reason' => 'Manual reset to normal',
                'created_at' => now(),
            ]);
            return $locked->fresh();
        });

        return response()->json(['data' => $this->fields($agent)]);
    }

    private function fields(Agent $agent): array
    {
        return [
            'effective_rank' => $agent->effectiveRank(),
            'rank_override_level' => $agent->activeRankOverride() ? (int) $agent->rank_override_level : null,
            'rank_override_expires_at' => $agent->activeRankOverride()
                ? $agent->rank_override_expires_at?->toIso8601String() : null,
        ];
    }
}
