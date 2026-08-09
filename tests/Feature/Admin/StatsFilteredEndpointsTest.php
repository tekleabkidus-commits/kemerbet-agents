<?php

use App\Models\Admin;
use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\StatusEvent;
use App\Models\VisitEvent;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/*
 * Fixed scenario (EAT timestamps, "now" = 2026-05-10 12:00):
 *
 * Default 7d range: 2026-05-04 .. 2026-05-10.
 * Agents: A (display 1), B (display 2).
 *
 * Visits: vis1 05-08 10:00 (kemerbet.com, desktop UA),
 *         vis3 05-09 22:30 (direct, no UA),
 *         vis2 05-09 23:00 (facebook.com, iPhone UA),
 *         vis3 05-01 09:00 (previous period — makes vis3 "returning").
 *
 * Deposit clicks: c1 vis1->A 05-08 10:05 (ref kemerbet.com),
 *                 c2 vis1->A 05-09 22:45,
 *                 c3 vis2->B 05-09 23:10,
 *                 c4 vis4->A 05-09 10:30,
 *                 + 5 old clicks oldvis->A on 2026-01-15 09:xx (records).
 *
 * Agent A lifecycle: went_online 05-09 10:00, went_offline 12:00,
 *                    went_online 13:30, session_expired 14:30.
 * Notification: post_offline_1h for A at 05-09 13:00 (answered 13:30).
 * daily_stats A: 05-08 (120 min, 1 session), 05-09 (180 min, 2 sessions).
 */
beforeEach(function () {
    $this->admin = Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
        'name' => 'Kidus',
    ]);

    $this->withHeaders(['Origin' => 'http://localhost:8001']);

    Carbon::setTestNow('2026-05-10 12:00:00');
    Cache::flush();

    $this->agentA = Agent::create(['display_number' => 1, 'telegram_username' => 'AGENTA', 'status' => 'active']);
    $this->agentB = Agent::create(['display_number' => 2, 'telegram_username' => 'AGENTB', 'status' => 'active']);

    $visit = fn (string $visitor, string $at, ?string $ref, ?string $ua) => VisitEvent::create([
        'visitor_id' => $visitor,
        'ip_address' => '127.0.0.1',
        'user_agent' => $ua,
        'referrer' => $ref,
        'created_at' => Carbon::parse($at),
    ]);
    $visit('vis1', '2026-05-08 10:00:00', 'https://kemerbet.com/deposit', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    $visit('vis3', '2026-05-09 22:30:00', null, null);
    $visit('vis2', '2026-05-09 23:00:00', 'https://facebook.com/kemerbet', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)');
    $visit('vis3', '2026-05-01 09:00:00', null, null);

    $click = fn (string $visitor, Agent $agent, string $at, ?string $ref = null) => ClickEvent::create([
        'agent_id' => $agent->id,
        'click_type' => 'deposit',
        'visitor_id' => $visitor,
        'ip_address' => '127.0.0.1',
        'referrer' => $ref,
        'created_at' => Carbon::parse($at),
    ]);
    $click('vis1', $this->agentA, '2026-05-08 10:05:00', 'https://kemerbet.com/deposit');
    $click('vis1', $this->agentA, '2026-05-09 22:45:00');
    $click('vis2', $this->agentB, '2026-05-09 23:10:00');
    $click('vis4', $this->agentA, '2026-05-09 10:30:00');
    foreach (range(0, 4) as $i) {
        $click('oldvis', $this->agentA, "2026-01-15 09:0{$i}:00");
    }

    $event = fn (Agent $agent, string $type, string $at) => StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => $type,
        'created_at' => Carbon::parse($at),
    ]);
    $event($this->agentA, StatusEvent::EVENT_WENT_ONLINE, '2026-05-09 10:00:00');
    $event($this->agentA, StatusEvent::EVENT_WENT_OFFLINE, '2026-05-09 12:00:00');
    $event($this->agentA, StatusEvent::EVENT_WENT_ONLINE, '2026-05-09 13:30:00');
    $event($this->agentA, StatusEvent::EVENT_SESSION_EXPIRED, '2026-05-09 14:30:00');

    DB::table('notification_log')->insert([
        'agent_id' => $this->agentA->id,
        'notification_type' => 'post_offline_1h',
        'reference_timestamp' => '2026-05-09 12:00:00',
        'created_at' => '2026-05-09 13:00:00',
    ]);

    DB::table('daily_stats')->insert([
        ['date' => '2026-05-08', 'agent_id' => $this->agentA->id, 'total_visits' => 0, 'unique_visitors' => 0, 'deposit_clicks' => 1, 'chat_clicks' => 0, 'minutes_live' => 120, 'times_went_online' => 1, 'created_at' => now()],
        ['date' => '2026-05-09', 'agent_id' => $this->agentA->id, 'total_visits' => 0, 'unique_visitors' => 0, 'deposit_clicks' => 2, 'chat_clicks' => 0, 'minutes_live' => 180, 'times_went_online' => 2, 'created_at' => now()],
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
});

// =====================================================================
// Validation + auth
// =====================================================================

it('rejects unknown agent_id with 422', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/funnel?agent_id=99999')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['agent_id']);
});

it('rejects out-of-range hour bounds with 422', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/funnel?hour_from=25')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['hour_from']);
});

it('requires authentication', function () {
    $this->getJson('/api/admin/stats/funnel')->assertUnauthorized();
});

// =====================================================================
// funnel
// =====================================================================

it('funnel returns current previous and change', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/admin/stats/funnel?range=7d');

    $response->assertOk();
    $data = $response->json('data');

    expect($data['current'])->toEqual([
        'total_visits' => 3,
        'unique_visitors' => 3,
        'deposit_clicks' => 4,
        'unique_clickers' => 3,
        'visit_to_click_rate' => 1,
    ]);
    expect($data['previous']['total_visits'])->toBe(1);
    expect($data['previous']['deposit_clicks'])->toBe(0);
    expect($data['change']['total_visits'])->toEqual(200);
    expect($data['change']['deposit_clicks'])->toBeNull();
});

it('funnel scopes click metrics to agent_id', function () {
    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/stats/funnel?range=7d&agent_id={$this->agentA->id}");

    $data = $response->assertOk()->json('data.current');
    expect($data['deposit_clicks'])->toBe(3);
    expect($data['unique_clickers'])->toBe(2);
    expect($data['total_visits'])->toBe(3); // visits have no agent link
});

it('funnel honors wrap-around hour filter', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/funnel?range=7d&hour_from=22&hour_to=4');

    $data = $response->assertOk()->json('data.current');
    expect($data['total_visits'])->toBe(2);
    expect($data['unique_visitors'])->toBe(2);
    expect($data['deposit_clicks'])->toBe(2);
    expect($data['unique_clickers'])->toBe(2);
});

// =====================================================================
// traffic
// =====================================================================

it('traffic returns referrers devices and new vs returning', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/admin/stats/traffic?range=7d');

    $data = $response->assertOk()->json('data');
    $referrers = collect($data['referrers']);

    expect($referrers->firstWhere('source', 'kemerbet.com')['count'])->toBe(1);
    expect($referrers->firstWhere('source', 'facebook.com')['count'])->toBe(1);
    expect($referrers->firstWhere('source', 'direct')['count'])->toBe(1);
    expect($data['devices'])->toEqual(['mobile' => 1, 'desktop' => 1, 'other' => 1]);
    expect($data['new_vs_returning'])->toEqual(['new' => 2, 'returning' => 1]);
    expect($data)->not->toHaveKey('agent_filter_unsupported');
});

it('traffic flags agent filter as unsupported', function () {
    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/stats/traffic?range=7d&agent_id={$this->agentA->id}");

    expect($response->assertOk()->json('data.agent_filter_unsupported'))->toBeTrue();
});

it('traffic honors wrap-around hour filter', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/traffic?range=7d&hour_from=22&hour_to=4');

    $data = $response->assertOk()->json('data');
    expect($data['devices'])->toEqual(['mobile' => 1, 'desktop' => 0, 'other' => 1]);
    expect($data['new_vs_returning'])->toEqual(['new' => 1, 'returning' => 1]);
});

// =====================================================================
// clicks-insights
// =====================================================================

it('clicks-insights returns repeat clickers distribution referrers and offline attempts', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/admin/stats/clicks-insights?range=7d');

    $data = $response->assertOk()->json('data');
    expect($data['repeat_clickers'])->toBe(1); // vis1 clicked on 2 days
    expect($data['one_day_clickers'])->toBe(2); // vis2, vis4
    expect($data['clicks_per_visitor_distribution'])->toEqual(['1' => 2, '2-3' => 1, '4-10' => 0, '10+' => 0]);
    expect(collect($data['click_referrers'])->firstWhere('source', 'direct')['count'])->toBe(3);
    expect(collect($data['click_referrers'])->firstWhere('source', 'kemerbet.com')['count'])->toBe(1);
    // c1 (before any lifecycle event), c2 (after session_expired), c3 (agent
    // B has no lifecycle events) — c4 landed while A was live.
    expect($data['offline_click_attempts'])->toBe(3);
});

it('clicks-insights scopes to agent_id', function () {
    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/stats/clicks-insights?range=7d&agent_id={$this->agentA->id}");

    $data = $response->assertOk()->json('data');
    expect($data['repeat_clickers'])->toBe(1);
    expect($data['one_day_clickers'])->toBe(1);
    expect($data['offline_click_attempts'])->toBe(2);
});

it('clicks-insights honors wrap-around hour filter', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/clicks-insights?range=7d&hour_from=22&hour_to=4');

    $data = $response->assertOk()->json('data');
    expect($data['repeat_clickers'])->toBe(0);
    expect($data['one_day_clickers'])->toBe(2);
    expect($data['offline_click_attempts'])->toBe(2);
});

// =====================================================================
// agent-performance
// =====================================================================

it('agent-performance returns per-agent rows sorted by clicks', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/admin/stats/agent-performance?range=7d');

    $data = $response->assertOk()->json('data');
    expect($data['hour_filter_unsupported'])->toBe([]);

    $rows = collect($data['agents']);
    expect($rows)->toHaveCount(2);

    $a = $rows->firstWhere('agent_id', $this->agentA->id);
    expect($rows->first()['agent_id'])->toBe($this->agentA->id); // most clicks first
    expect($a['deposit_clicks'])->toBe(3);
    expect($a['minutes_live'])->toBe(300);
    expect($a['clicks_per_hour_online'])->toEqual(0.6);
    expect($a['uptime_days'])->toEqual(round(2 / 7, 4));
    expect($a['sessions'])->toBe(3);
    expect($a['avg_session_minutes'])->toBe(100);
    expect($a['expired_offline_count'])->toBe(1);
    expect($a['manual_offline_count'])->toBe(1);
    expect($a['expired_vs_manual_offline'])->toEqual(1);
    expect($a['notification_response_rate'])->toEqual(1);

    $b = $rows->firstWhere('agent_id', $this->agentB->id);
    expect($b['deposit_clicks'])->toBe(1);
    expect($b['clicks_per_hour_online'])->toBeNull();
    expect($b['expired_vs_manual_offline'])->toBeNull();
    expect($b['notification_response_rate'])->toBeNull();
});

it('agent-performance scopes to agent_id', function () {
    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/stats/agent-performance?range=7d&agent_id={$this->agentB->id}");

    $rows = $response->assertOk()->json('data.agents');
    expect($rows)->toHaveCount(1);
    expect($rows[0]['agent_id'])->toBe($this->agentB->id);
});

it('agent-performance flags rollup metrics under hour filter', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/agent-performance?range=7d&hour_from=22&hour_to=4');

    $data = $response->assertOk()->json('data');
    expect($data['hour_filter_unsupported'])->toContain('minutes_live');

    $a = collect($data['agents'])->firstWhere('agent_id', $this->agentA->id);
    expect($a['deposit_clicks'])->toBe(1); // only c2 at 22:45
});

// =====================================================================
// coverage
// =====================================================================

it('coverage returns live matrix clicks matrix and gap hours', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/admin/stats/coverage?range=7d');

    $data = $response->assertOk()->json('data');

    $dow0509 = Carbon::parse('2026-05-09')->dayOfWeek;
    $liveAt10 = collect($data['live_matrix'])->first(fn ($m) => $m['day'] === $dow0509 && $m['hour'] === 10);
    expect($liveAt10['avg_agents_live'])->toEqual(1);
    $liveAt13 = collect($data['live_matrix'])->first(fn ($m) => $m['day'] === $dow0509 && $m['hour'] === 13);
    expect($liveAt13['avg_agents_live'])->toEqual(0.5);

    $dow0508 = Carbon::parse('2026-05-08')->dayOfWeek;
    $clicksAt10 = collect($data['clicks_matrix'])->first(fn ($m) => $m['day'] === $dow0508 && $m['hour'] === 10);
    expect($clicksAt10['count'])->toBe(1);

    // 6 full days (144 slots) + 12 slots on 05-10 before "now", minus the
    // 4 slots agent A was live (hours 10, 11, 13, 14 on 05-09).
    expect($data['gap_hours'])->toHaveCount(152);
    expect(collect($data['gap_hours'])->contains(['date' => '2026-05-09', 'hour' => 10]))->toBeFalse();
    expect(collect($data['gap_hours'])->contains(['date' => '2026-05-08', 'hour' => 10]))->toBeTrue();
});

it('coverage scopes to agent_id', function () {
    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/stats/coverage?range=7d&agent_id={$this->agentB->id}");

    $data = $response->assertOk()->json('data');
    expect($data['live_matrix'])->toBe([]);
    expect($data['gap_hours'])->toHaveCount(156);
});

it('coverage honors wrap-around hour filter', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/coverage?range=7d&hour_from=22&hour_to=4');

    $data = $response->assertOk()->json('data');
    // 7 allowed hours x 6 full days + hours 0-4 on 05-10; agent A was never
    // live during 22-04, so every slot is a gap.
    expect($data['gap_hours'])->toHaveCount(47);
    expect($data['live_matrix'])->toBe([]);
    expect(collect($data['clicks_matrix'])->sum('count'))->toBe(2); // c2 + c3
});

// =====================================================================
// records
// =====================================================================

it('records returns all-time bests ignoring the date filter', function () {
    $response = $this->actingAs($this->admin)->getJson('/api/admin/stats/records?range=7d');

    $data = $response->assertOk()->json('data');
    expect($data['best_click_day'])->toEqual(['date' => '2026-01-15', 'count' => 5]);
    expect($data['best_click_hour']['count'])->toBe(5);
    expect($data['best_visit_day'])->toEqual(['date' => '2026-05-09', 'count' => 2]);
    expect($data['best_visit_hour']['count'])->toBe(1);
});

it('records honors agent_id', function () {
    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/stats/records?agent_id={$this->agentB->id}");

    $data = $response->assertOk()->json('data');
    expect($data['best_click_day'])->toEqual(['date' => '2026-05-09', 'count' => 1]);
});

it('accepts bare from and to params without range=custom', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/stats/funnel?from=2026-05-08&to=2026-05-09');

    $response->assertOk();
    expect($response->json('range'))->toEqual(['from' => '2026-05-08', 'to' => '2026-05-09']);
    expect($response->json('data.current.total_visits'))->toBe(3);
});
