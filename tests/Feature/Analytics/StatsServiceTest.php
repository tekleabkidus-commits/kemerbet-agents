<?php

use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\DailyStat;
use App\Models\VisitEvent;
use App\Services\StatsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->agent = Agent::create([
        'display_number' => 1,
        'telegram_username' => 'STATS1',
        'status' => 'active',
    ]);

    $this->service = app(StatsService::class);

    Carbon::setTestNow('2026-04-30 12:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
    Cache::flush();
});

function seedDailyStat(
    string $date,
    ?int $agentId,
    int $visits = 0,
    int $unique = 0,
    int $deposits = 0,
    int $chats = 0,
    int $minutes = 0,
    int $sessions = 0,
): void {
    DailyStat::create([
        'date' => $date,
        'agent_id' => $agentId,
        'total_visits' => $visits,
        'unique_visitors' => $unique,
        'deposit_clicks' => $deposits,
        'chat_clicks' => $chats,
        'minutes_live' => $minutes,
        'times_went_online' => $sessions,
        'created_at' => now(),
    ]);
}

// =====================================================================
// overview
// =====================================================================

// 1. Aggregates daily_stats for past days
it('overview aggregates daily_stats for past days', function () {
    seedDailyStat('2026-04-28', null, visits: 100, unique: 50, deposits: 10, chats: 2);
    seedDailyStat('2026-04-29', null, visits: 200, unique: 80, deposits: 20, chats: 3);
    seedDailyStat('2026-04-28', $this->agent->id, minutes: 120, sessions: 3, deposits: 5);
    seedDailyStat('2026-04-29', $this->agent->id, minutes: 90, sessions: 2, deposits: 15);

    $result = $this->service->overview(
        Carbon::parse('2026-04-28'),
        Carbon::parse('2026-04-29'),
    );

    expect($result['total_visits'])->toBe(300)
        ->and($result['unique_visitors'])->toBe(130)
        ->and($result['deposit_clicks'])->toBe(30)
        ->and($result['chat_clicks'])->toBe(5)
        ->and($result['total_minutes_live'])->toBe(210)
        ->and($result['total_sessions'])->toBe(5)
        ->and($result['ctr'])->toBe(10.0);
});

// 2. Overview includes today's live data
it('overview includes today live data', function () {
    // Today is 2026-04-30 (setTestNow in beforeEach)
    ClickEvent::create([
        'agent_id' => $this->agent->id,
        'click_type' => 'deposit',
        'visitor_id' => 'v1',
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);
    VisitEvent::create([
        'visitor_id' => 'vis1',
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse('2026-04-30 08:00:00'),
    ]);

    $result = $this->service->overview(
        Carbon::parse('2026-04-30'),
        Carbon::parse('2026-04-30'),
    );

    expect($result['total_visits'])->toBe(1)
        ->and($result['deposit_clicks'])->toBe(1);
});

// 3. CTR handles zero visits
it('overview ctr handles zero visits', function () {
    seedDailyStat('2026-04-28', null, visits: 0, deposits: 5);

    $result = $this->service->overview(
        Carbon::parse('2026-04-28'),
        Carbon::parse('2026-04-28'),
    );

    expect($result['ctr'])->toBe(0);
});

// =====================================================================
// timeline
// =====================================================================

// 4. Returns continuous date series with zeros for empty days
it('timeline returns continuous date series', function () {
    seedDailyStat('2026-04-26', null, visits: 10, deposits: 2);
    seedDailyStat('2026-04-28', null, visits: 30, deposits: 5);

    $result = $this->service->timeline(
        Carbon::parse('2026-04-25'),
        Carbon::parse('2026-04-29'),
    );

    expect($result)->toHaveCount(5);
    expect($result[0]['date'])->toBe('2026-04-25');
    expect($result[0]['total_visits'])->toBe(0);
    expect($result[1]['date'])->toBe('2026-04-26');
    expect($result[1]['total_visits'])->toBe(10);
    expect($result[3]['date'])->toBe('2026-04-28');
    expect($result[3]['deposit_clicks'])->toBe(5);
});

// 5. Timeline includes today
it('timeline includes today with live data', function () {
    VisitEvent::create([
        'visitor_id' => 'vis1',
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    $result = $this->service->timeline(
        Carbon::parse('2026-04-30'),
        Carbon::parse('2026-04-30'),
    );

    expect($result)->toHaveCount(1);
    expect($result[0]['date'])->toBe('2026-04-30');
    expect($result[0]['total_visits'])->toBe(1);
});

// =====================================================================
// leaderboard
// =====================================================================

// 6. Sorts by deposit_clicks descending
it('leaderboard sorts by deposit_clicks desc', function () {
    $agentB = Agent::create([
        'display_number' => 2,
        'telegram_username' => 'STATS2',
        'status' => 'active',
    ]);

    seedDailyStat('2026-04-28', $this->agent->id, deposits: 5, minutes: 60, sessions: 1);
    seedDailyStat('2026-04-28', $agentB->id, deposits: 15, minutes: 30, sessions: 2);

    $result = $this->service->leaderboard(
        Carbon::parse('2026-04-28'),
        Carbon::parse('2026-04-28'),
    );

    expect($result[0]['agent_id'])->toBe($agentB->id)
        ->and($result[0]['deposit_clicks'])->toBe(15)
        ->and($result[1]['agent_id'])->toBe($this->agent->id);
});

// 7. Sorts by click_rate
it('leaderboard sorts by click_rate', function () {
    $agentB = Agent::create([
        'display_number' => 2,
        'telegram_username' => 'STATS2',
        'status' => 'active',
    ]);

    // Agent A: 10 clicks / 120 min = 0.0833
    seedDailyStat('2026-04-28', $this->agent->id, deposits: 10, minutes: 120, sessions: 1);
    // Agent B: 8 clicks / 30 min = 0.2667
    seedDailyStat('2026-04-28', $agentB->id, deposits: 8, minutes: 30, sessions: 1);

    $result = $this->service->leaderboard(
        Carbon::parse('2026-04-28'),
        Carbon::parse('2026-04-28'),
        sort: 'click_rate',
    );

    expect($result[0]['agent_id'])->toBe($agentB->id);
});

// 8. Respects limit
it('leaderboard respects limit', function () {
    for ($i = 2; $i <= 6; $i++) {
        $a = Agent::create([
            'display_number' => $i,
            'telegram_username' => "LB{$i}",
            'status' => 'active',
        ]);
        seedDailyStat('2026-04-28', $a->id, deposits: $i, sessions: 1);
    }
    seedDailyStat('2026-04-28', $this->agent->id, deposits: 1, sessions: 1);

    $result = $this->service->leaderboard(
        Carbon::parse('2026-04-28'),
        Carbon::parse('2026-04-28'),
        limit: 3,
    );

    expect($result)->toHaveCount(3);
});

// =====================================================================
// agentDetail
// =====================================================================

// 9. Summary aggregates correctly
it('agentDetail summary aggregates correctly', function () {
    seedDailyStat('2026-04-27', $this->agent->id, deposits: 5, minutes: 60, sessions: 2);
    seedDailyStat('2026-04-28', $this->agent->id, deposits: 10, minutes: 90, sessions: 3);

    $result = $this->service->agentDetail(
        $this->agent,
        Carbon::parse('2026-04-27'),
        Carbon::parse('2026-04-28'),
    );

    expect($result['summary']['deposit_clicks'])->toBe(15)
        ->and($result['summary']['minutes_live'])->toBe(150)
        ->and($result['summary']['times_went_online'])->toBe(5)
        ->and($result['summary']['avg_session_duration_minutes'])->toBe(30);
});

// 10. agentDetail timeline includes today
it('agentDetail timeline includes today', function () {
    ClickEvent::create([
        'agent_id' => $this->agent->id,
        'click_type' => 'deposit',
        'visitor_id' => 'v1',
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    $result = $this->service->agentDetail(
        $this->agent,
        Carbon::parse('2026-04-30'),
        Carbon::parse('2026-04-30'),
    );

    expect($result['timeline'][0]['date'])->toBe('2026-04-30')
        ->and($result['timeline'][0]['deposit_clicks'])->toBe(1);
});

// 11. All-time spans entire history
it('agentDetail all_time spans entire history', function () {
    // Old data outside the query range
    seedDailyStat('2026-03-15', $this->agent->id, deposits: 50, minutes: 300, sessions: 10);
    // Recent data in the query range
    seedDailyStat('2026-04-28', $this->agent->id, deposits: 5, minutes: 60, sessions: 2);

    $result = $this->service->agentDetail(
        $this->agent,
        Carbon::parse('2026-04-28'),
        Carbon::parse('2026-04-28'),
    );

    expect($result['summary']['deposit_clicks'])->toBe(5)
        ->and($result['all_time']['deposit_clicks'])->toBe(55)
        ->and($result['all_time']['minutes_live'])->toBe(360);
});
