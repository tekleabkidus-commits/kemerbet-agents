<?php

use App\Models\Admin;
use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\DailyStat;
use App\Models\PaymentMethod;
use App\Models\VisitEvent;
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

// =====================================================================
// heatmap
// =====================================================================

function seedHeatmapClick(Agent $agent, string $eatTime): void
{
    ClickEvent::create([
        'agent_id' => $agent->id,
        'click_type' => 'deposit',
        'visitor_id' => 'v_'.uniqid(),
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse($eatTime),
    ]);
}

// 13. Empty range returns empty data
it('heatmap returns empty data for empty range', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/heatmap?range=7d');

    $response->assertOk();
    expect($response->json('data'))->toBe([]);
});

// 14. Counts clicks by day and hour
it('heatmap counts clicks by day and hour', function () {
    // 3 clicks on same day+hour
    seedHeatmapClick($this->agent, '2026-04-28 14:10:00');
    seedHeatmapClick($this->agent, '2026-04-28 14:30:00');
    seedHeatmapClick($this->agent, '2026-04-28 14:55:00');
    // 1 click at different hour
    seedHeatmapClick($this->agent, '2026-04-28 09:00:00');

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/heatmap?range=custom&from=2026-04-28&to=2026-04-28');

    $response->assertOk();
    $data = collect($response->json('data'));

    $hour14 = $data->firstWhere('hour', 14);
    $hour9 = $data->firstWhere('hour', 9);

    expect($hour14['count'])->toBe(3)
        ->and($hour9['count'])->toBe(1);
});

// 15. Correct day_of_week mapping (Apr 30 2026 = Thursday = DOW 4)
it('heatmap maps day_of_week correctly', function () {
    seedHeatmapClick($this->agent, '2026-04-30 10:00:00');

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/heatmap?range=custom&from=2026-04-30&to=2026-04-30');

    $data = collect($response->json('data'));
    expect($data)->toHaveCount(1)
        ->and($data[0]['day'])->toBe(4)  // Thursday
        ->and($data[0]['hour'])->toBe(10);
});

// 16. Excludes events outside range
it('heatmap excludes events outside range', function () {
    seedHeatmapClick($this->agent, '2026-04-28 10:00:00'); // inside
    seedHeatmapClick($this->agent, '2026-04-27 10:00:00'); // outside (before)
    seedHeatmapClick($this->agent, '2026-04-29 10:00:00'); // outside (after)

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/heatmap?range=custom&from=2026-04-28&to=2026-04-28');

    $data = $response->json('data');
    expect($data)->toHaveCount(1)
        ->and($data[0]['count'])->toBe(1);
});

// 17. Heatmap requires authentication
it('heatmap requires authentication', function () {
    $this->getJson('/api/admin/stats/heatmap?range=7d')
        ->assertUnauthorized();
});

// =====================================================================
// payment-methods breakdown
// =====================================================================

// 18. Returns all methods with 0 clicks
it('payment-methods returns all methods with click_count 0 when no clicks', function () {
    $pmA = PaymentMethod::create(['slug' => 'telebirr', 'display_name' => 'TeleBirr', 'display_order' => 1, 'is_active' => true]);
    $pmB = PaymentMethod::create(['slug' => 'cbe_birr', 'display_name' => 'CBE Birr', 'display_order' => 2, 'is_active' => true]);

    // Assign pmA to the test agent
    $this->agent->paymentMethods()->attach($pmA->id);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/payment-methods?range=7d');

    $response->assertOk();
    $data = collect($response->json('data'));

    expect($data)->toHaveCount(2);

    $telebirr = $data->firstWhere('slug', 'telebirr');
    expect($telebirr['click_count'])->toBe(0)
        ->and($telebirr['agent_count'])->toBe(1);

    $cbe = $data->firstWhere('slug', 'cbe_birr');
    expect($cbe['click_count'])->toBe(0)
        ->and($cbe['agent_count'])->toBe(0);
});

// 19. Counts clicks per method from jsonb array
it('payment-methods counts clicks per method from jsonb', function () {
    PaymentMethod::create(['slug' => 'telebirr', 'display_name' => 'TeleBirr', 'display_order' => 1, 'is_active' => true]);
    PaymentMethod::create(['slug' => 'cbe_birr', 'display_name' => 'CBE Birr', 'display_order' => 2, 'is_active' => true]);

    ClickEvent::create([
        'agent_id' => $this->agent->id,
        'click_type' => 'deposit',
        'visitor_id' => 'v1',
        'ip_address' => '127.0.0.1',
        'payment_methods' => ['telebirr', 'cbe_birr'],
        'created_at' => Carbon::parse('2026-04-28 10:00:00'),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/payment-methods?range=custom&from=2026-04-28&to=2026-04-28');

    $data = collect($response->json('data'));

    expect($data->firstWhere('slug', 'telebirr')['click_count'])->toBe(1)
        ->and($data->firstWhere('slug', 'cbe_birr')['click_count'])->toBe(1);
});

// 20. One click with multiple methods counts in each (cross-join verification)
it('payment-methods one click counts in each method present', function () {
    PaymentMethod::create(['slug' => 'telebirr', 'display_name' => 'TeleBirr', 'display_order' => 1, 'is_active' => true]);
    PaymentMethod::create(['slug' => 'mpesa', 'display_name' => 'M-Pesa', 'display_order' => 2, 'is_active' => true]);
    PaymentMethod::create(['slug' => 'dashen', 'display_name' => 'Dashen', 'display_order' => 3, 'is_active' => true]);

    // Single click with 3 methods
    ClickEvent::create([
        'agent_id' => $this->agent->id,
        'click_type' => 'deposit',
        'visitor_id' => 'v1',
        'ip_address' => '127.0.0.1',
        'payment_methods' => ['telebirr', 'mpesa', 'dashen'],
        'created_at' => Carbon::parse('2026-04-28 10:00:00'),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/payment-methods?range=custom&from=2026-04-28&to=2026-04-28');

    $data = collect($response->json('data'));

    // All 3 methods get click_count=1 from the single click
    expect($data->firstWhere('slug', 'telebirr')['click_count'])->toBe(1)
        ->and($data->firstWhere('slug', 'mpesa')['click_count'])->toBe(1)
        ->and($data->firstWhere('slug', 'dashen')['click_count'])->toBe(1);
});

// 21. Sorted by click_count descending
it('payment-methods sorted by click_count descending', function () {
    PaymentMethod::create(['slug' => 'telebirr', 'display_name' => 'TeleBirr', 'display_order' => 1, 'is_active' => true]);
    PaymentMethod::create(['slug' => 'cbe_birr', 'display_name' => 'CBE Birr', 'display_order' => 2, 'is_active' => true]);

    // 3 clicks for cbe_birr, 1 for telebirr
    for ($i = 0; $i < 3; $i++) {
        ClickEvent::create([
            'agent_id' => $this->agent->id,
            'click_type' => 'deposit',
            'visitor_id' => 'v'.$i,
            'ip_address' => '127.0.0.1',
            'payment_methods' => ['cbe_birr'],
            'created_at' => Carbon::parse('2026-04-28 10:00:00'),
        ]);
    }
    ClickEvent::create([
        'agent_id' => $this->agent->id,
        'click_type' => 'deposit',
        'visitor_id' => 'v99',
        'ip_address' => '127.0.0.1',
        'payment_methods' => ['telebirr'],
        'created_at' => Carbon::parse('2026-04-28 11:00:00'),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/payment-methods?range=custom&from=2026-04-28&to=2026-04-28');

    $data = $response->json('data');
    expect($data[0]['slug'])->toBe('cbe_birr')
        ->and($data[0]['click_count'])->toBe(3)
        ->and($data[1]['slug'])->toBe('telebirr')
        ->and($data[1]['click_count'])->toBe(1);
});

// 22. Payment methods requires authentication
it('payment-methods requires authentication', function () {
    $this->getJson('/api/admin/stats/payment-methods?range=7d')
        ->assertUnauthorized();
});

// =====================================================================
// range=today regression
// =====================================================================

// 23. overview with range=today returns only today's data (not 7-day aggregate)
it('overview with range=today returns only today data', function () {
    Carbon::setTestNow('2026-04-30 12:00:00');

    $today = Carbon::parse('2026-04-30')->toDateString();

    // Seed yesterday in daily_stats (would be included if range mistakenly returned 7d)
    seedStat('2026-04-29', null, ['total_visits' => 200, 'deposit_clicks' => 30]);
    seedStat('2026-04-24', null, ['total_visits' => 500, 'deposit_clicks' => 50]);

    // Seed today's raw visit + click events (today is computed live, not from daily_stats)
    VisitEvent::create([
        'visitor_id' => 'v_today',
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    ClickEvent::create([
        'agent_id' => $this->agent->id,
        'click_type' => 'deposit',
        'visitor_id' => 'v_today',
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse('2026-04-30 10:00:00'),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/overview?range=today');

    $response->assertOk();

    // Should include only today's live-computed data (1 visit, 1 click)
    // NOT the 700+ visits from yesterday + 6 days ago
    expect($response->json('data.total_visits'))->toBe(1)
        ->and($response->json('data.deposit_clicks'))->toBe(1)
        ->and($response->json('range.from'))->toBe($today)
        ->and($response->json('range.to'))->toBe($today);
});
