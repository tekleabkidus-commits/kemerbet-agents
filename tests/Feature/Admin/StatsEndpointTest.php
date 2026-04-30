<?php

use App\Models\Admin;
use App\Models\Agent;
use App\Models\DailyStat;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
        'name' => 'Kidus',
    ]);

    $this->withHeaders(['Origin' => 'http://localhost:8001']);

    $this->agent = Agent::create([
        'display_number' => 1,
        'telegram_username' => 'STATSAPI',
        'status' => 'active',
    ]);

    Carbon::setTestNow('2026-04-30 12:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

function seedStat(string $date, ?int $agentId, array $data = []): void
{
    DailyStat::create(array_merge([
        'date' => $date,
        'agent_id' => $agentId,
        'total_visits' => 0,
        'unique_visitors' => 0,
        'deposit_clicks' => 0,
        'chat_clicks' => 0,
        'minutes_live' => 0,
        'times_went_online' => 0,
        'created_at' => now(),
    ], $data));
}

// =====================================================================
// overview
// =====================================================================

// 1. 200 with default 7d range
it('overview returns 200 with default 7d range', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/overview');

    $response->assertOk()
        ->assertJsonStructure(['range' => ['from', 'to'], 'data']);

    // 7d inclusive: Apr 24 → Apr 30
    expect($response->json('range.from'))->toBe('2026-04-24')
        ->and($response->json('range.to'))->toBe('2026-04-30');
});

// 2. 30d range
it('overview returns correct 30d range', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/overview?range=30d');

    $response->assertOk();
    // 30d inclusive: Apr 1 → Apr 30
    expect($response->json('range.from'))->toBe('2026-04-01')
        ->and($response->json('range.to'))->toBe('2026-04-30');
});

// 3. custom range validates from/to
it('overview custom range returns 422 when from is missing', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/overview?range=custom&to=2026-04-30')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['from']);
});

// 4. requires authentication
it('overview requires authentication', function () {
    $this->getJson('/api/admin/stats/overview')
        ->assertUnauthorized();
});

// =====================================================================
// timeline
// =====================================================================

// 5. 200 with date series
it('timeline returns date series', function () {
    seedStat('2026-04-28', null, ['total_visits' => 50, 'deposit_clicks' => 5]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/timeline?range=7d');

    $response->assertOk();
    $data = $response->json('data');

    // 7 days inclusive
    expect($data)->toHaveCount(7);
    expect($data[0]['date'])->toBe('2026-04-24');
    expect($data[6]['date'])->toBe('2026-04-30');
});

// 6. continuous dates even when empty
it('timeline has continuous dates with zeros for empty days', function () {
    // Only seed one day in the range
    seedStat('2026-04-27', null, ['deposit_clicks' => 10]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/timeline?range=7d');

    $data = $response->json('data');
    expect($data)->toHaveCount(7);

    // Apr 27 has data, others are zero
    $apr27 = collect($data)->firstWhere('date', '2026-04-27');
    $apr25 = collect($data)->firstWhere('date', '2026-04-25');
    expect($apr27['deposit_clicks'])->toBe(10);
    expect($apr25['deposit_clicks'])->toBe(0);
});

// =====================================================================
// leaderboard
// =====================================================================

// 7. 200 sorted by default (deposit_clicks)
it('leaderboard returns agents sorted by deposit_clicks', function () {
    $agentB = Agent::create([
        'display_number' => 2,
        'telegram_username' => 'STATSB',
        'status' => 'active',
    ]);

    seedStat('2026-04-28', $this->agent->id, ['deposit_clicks' => 5]);
    seedStat('2026-04-28', $agentB->id, ['deposit_clicks' => 20]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/leaderboard?range=7d');

    $response->assertOk();
    $data = $response->json('data');
    expect($data[0]['agent_id'])->toBe($agentB->id)
        ->and($data[0]['deposit_clicks'])->toBe(20);
});

// 8. validates sort whitelist
it('leaderboard returns 422 for invalid sort', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/leaderboard?sort=invalid_column')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['sort']);
});

// 9. respects limit param
it('leaderboard respects limit param', function () {
    for ($i = 2; $i <= 6; $i++) {
        $a = Agent::create([
            'display_number' => $i,
            'telegram_username' => "LB{$i}",
            'status' => 'active',
        ]);
        seedStat('2026-04-28', $a->id, ['deposit_clicks' => $i]);
    }
    seedStat('2026-04-28', $this->agent->id, ['deposit_clicks' => 1]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/leaderboard?range=7d&limit=3');

    expect($response->json('data'))->toHaveCount(3);
});

// =====================================================================
// agent/{id}
// =====================================================================

// 10. 200 with summary + timeline + all_time
it('agentDetail returns summary timeline and all_time', function () {
    seedStat('2026-04-28', $this->agent->id, ['deposit_clicks' => 10, 'minutes_live' => 60, 'times_went_online' => 2]);

    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/stats/agent/{$this->agent->id}?range=7d");

    $response->assertOk()
        ->assertJsonStructure([
            'range',
            'data' => [
                'summary' => ['deposit_clicks', 'minutes_live', 'times_went_online', 'click_rate', 'avg_session_duration_minutes'],
                'timeline',
                'all_time' => ['deposit_clicks', 'minutes_live', 'times_went_online'],
            ],
        ]);

    expect($response->json('data.summary.deposit_clicks'))->toBe(10);
});

// 11. 404 for nonexistent agent
it('agentDetail returns 404 for nonexistent agent', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/agent/99999')
        ->assertNotFound();
});

// 12. requires authentication
it('agentDetail requires authentication', function () {
    $this->getJson("/api/admin/stats/agent/{$this->agent->id}")
        ->assertUnauthorized();
});
