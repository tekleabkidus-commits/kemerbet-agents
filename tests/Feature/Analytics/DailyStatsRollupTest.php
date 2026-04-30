<?php

use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\DailyStat;
use App\Models\StatusEvent;
use App\Models\VisitEvent;
use App\Services\DailyStatsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->agent = Agent::create([
        'display_number' => 1,
        'telegram_username' => 'ROLLUP1',
        'status' => 'active',
    ]);

    $this->service = app(DailyStatsService::class);
});

afterEach(function () {
    Carbon::setTestNow();
});

// Target date for most tests: 2026-04-30 EAT
// EAT day bounds: 2026-04-30 00:00 EAT = 2026-04-29 21:00 UTC
//                 2026-05-01 00:00 EAT = 2026-04-30 21:00 UTC

function rollupDate(): Carbon
{
    return Carbon::parse('2026-04-30', 'Africa/Addis_Ababa');
}

// Helpers create timestamps in EAT (app timezone = Africa/Addis_Ababa).
// All times in test comments refer to EAT unless stated otherwise.

function onlineEvent(Agent $agent, string $eatTime, int $duration = 60): void
{
    StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => $duration,
        'created_at' => Carbon::parse($eatTime),
    ]);
}

function offlineEvent(Agent $agent, string $eatTime): void
{
    StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'created_at' => Carbon::parse($eatTime),
    ]);
}

function clickEvent(Agent $agent, string $eatTime, string $type = 'deposit'): void
{
    ClickEvent::create([
        'agent_id' => $agent->id,
        'click_type' => $type,
        'visitor_id' => 'v_'.uniqid(),
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse($eatTime),
    ]);
}

function visitEvent(string $eatTime, ?string $visitorId = null): void
{
    VisitEvent::create([
        'visitor_id' => $visitorId ?? 'vis_'.uniqid(),
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse($eatTime),
    ]);
}

// 1. Empty day creates agent row with all zeros
it('creates zero-value rows for empty day', function () {
    $this->service->rollupDay(rollupDate());

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->date->toDateString())->toBe('2026-04-30')
        ->and($row->total_visits)->toBe(0)
        ->and($row->unique_visitors)->toBe(0)
        ->and($row->deposit_clicks)->toBe(0)
        ->and($row->chat_clicks)->toBe(0)
        ->and($row->minutes_live)->toBe(0)
        ->and($row->times_went_online)->toBe(0);
});

// 2. Single session: correct minutes_live
it('counts minutes for single session', function () {
    onlineEvent($this->agent, '2026-04-30 09:00:00', 60);
    offlineEvent($this->agent, '2026-04-30 10:00:00');

    $this->service->rollupDay(rollupDate());

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->minutes_live)->toBe(60);
});

// 3. Multiple sessions sum correctly
it('sums minutes for multiple sessions', function () {
    // Session 1: 30 minutes
    onlineEvent($this->agent, '2026-04-30 08:00:00', 30);
    offlineEvent($this->agent, '2026-04-30 08:30:00');

    // Session 2: 45 minutes
    onlineEvent($this->agent, '2026-04-30 14:00:00', 45);
    offlineEvent($this->agent, '2026-04-30 14:45:00');

    $this->service->rollupDay(rollupDate());

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->minutes_live)->toBe(75);
});

// 4. Overnight session clamped to day boundary
it('clamps overnight session to day boundary', function () {
    // Session: Apr 29 23:00 EAT → Apr 30 01:00 EAT (2 hours spanning midnight)
    onlineEvent($this->agent, '2026-04-29 23:00:00', 120);
    offlineEvent($this->agent, '2026-04-30 01:00:00');

    // Yesterday rollup (Apr 29 EAT): 23:00 → midnight = 60 min
    $this->service->rollupDay(Carbon::parse('2026-04-29', 'Africa/Addis_Ababa'));
    $yesterday = DailyStat::where('agent_id', $this->agent->id)
        ->where('date', '2026-04-29')->sole();
    expect($yesterday->minutes_live)->toBe(60);

    // Today rollup (Apr 30 EAT): midnight → 01:00 = 60 min
    $this->service->rollupDay(rollupDate());
    $today = DailyStat::where('agent_id', $this->agent->id)
        ->where('date', '2026-04-30')->sole();
    expect($today->minutes_live)->toBe(60);
});

// 5. deposit_clicks counted correctly
it('counts deposit clicks correctly', function () {
    clickEvent($this->agent, '2026-04-30 09:00:00');
    clickEvent($this->agent, '2026-04-30 13:00:00');
    clickEvent($this->agent, '2026-04-30 18:00:00');

    $this->service->rollupDay(rollupDate());

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->deposit_clicks)->toBe(3);
});

// 6. chat_clicks counted separately
it('counts chat clicks separately from deposit clicks', function () {
    clickEvent($this->agent, '2026-04-30 09:00:00', 'deposit');
    clickEvent($this->agent, '2026-04-30 10:00:00', 'deposit');
    clickEvent($this->agent, '2026-04-30 11:00:00', 'chat');

    $this->service->rollupDay(rollupDate());

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->deposit_clicks)->toBe(2)
        ->and($row->chat_clicks)->toBe(1);
});

// 7. Site-wide row: visit counts with unique visitors
it('counts visits in site-wide row', function () {
    visitEvent('2026-04-30 09:00:00', 'visitor_a');
    visitEvent('2026-04-30 10:00:00', 'visitor_a');
    visitEvent('2026-04-30 11:00:00', 'visitor_b');
    visitEvent('2026-04-30 12:00:00', 'visitor_c');
    visitEvent('2026-04-30 13:00:00', 'visitor_c');

    $this->service->rollupDay(rollupDate());

    $siteRow = DailyStat::whereNull('agent_id')->sole();
    expect($siteRow->total_visits)->toBe(5)
        ->and($siteRow->unique_visitors)->toBe(3);
});

// 8. times_went_online counted
it('counts times went online', function () {
    onlineEvent($this->agent, '2026-04-30 08:00:00', 30);
    offlineEvent($this->agent, '2026-04-30 08:30:00');
    onlineEvent($this->agent, '2026-04-30 14:00:00', 60);
    offlineEvent($this->agent, '2026-04-30 15:00:00');

    $this->service->rollupDay(rollupDate());

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->times_went_online)->toBe(2);
});

// 9. Site-wide row aggregates clicks across agents
it('creates site-wide row with aggregated clicks', function () {
    $agentB = Agent::create([
        'display_number' => 2,
        'telegram_username' => 'ROLLUP2',
        'status' => 'active',
    ]);

    clickEvent($this->agent, '2026-04-30 09:00:00');
    clickEvent($this->agent, '2026-04-30 10:00:00');
    clickEvent($this->agent, '2026-04-30 11:00:00');
    clickEvent($agentB, '2026-04-30 12:00:00');
    clickEvent($agentB, '2026-04-30 13:00:00');

    $this->service->rollupDay(rollupDate());

    $siteRow = DailyStat::whereNull('agent_id')->sole();
    expect($siteRow->deposit_clicks)->toBe(5);

    $rowA = DailyStat::where('agent_id', $this->agent->id)->sole();
    $rowB = DailyStat::where('agent_id', $agentB->id)->sole();
    expect($rowA->deposit_clicks)->toBe(3)
        ->and($rowB->deposit_clicks)->toBe(2);
});

// 10. Idempotent: re-run produces same result
it('is idempotent on re-run', function () {
    clickEvent($this->agent, '2026-04-30 09:00:00');
    onlineEvent($this->agent, '2026-04-30 08:00:00', 60);
    offlineEvent($this->agent, '2026-04-30 09:00:00');

    $this->service->rollupDay(rollupDate());
    $this->service->rollupDay(rollupDate());

    // 1 per-agent row + 1 site-wide row, not doubled
    expect(DailyStat::where('date', '2026-04-30')->count())->toBe(2);

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->deposit_clicks)->toBe(1)
        ->and($row->minutes_live)->toBe(60);
});

// 11. Disabled agent excluded
it('excludes disabled agents from rollup', function () {
    $disabled = Agent::create([
        'display_number' => 99,
        'telegram_username' => 'DISABLED',
        'status' => Agent::STATUS_DISABLED,
    ]);

    clickEvent($disabled, '2026-04-30 09:00:00');

    $this->service->rollupDay(rollupDate());

    expect(DailyStat::where('agent_id', $disabled->id)->exists())->toBeFalse();
});

// 12. EAT boundary: adjacent day events excluded
it('correctly handles EAT day boundary for adjacent events', function () {
    // Rollup target: 2026-04-30 EAT
    // EAT day: [2026-04-30 00:00 EAT, 2026-05-01 00:00 EAT)

    // Event INSIDE the day: 2026-04-30 23:59 EAT
    clickEvent($this->agent, '2026-04-30 23:59:00');

    // Event AFTER the day: 2026-05-01 00:01 EAT
    clickEvent($this->agent, '2026-05-01 00:01:00');

    // Event BEFORE the day: 2026-04-29 23:59 EAT
    clickEvent($this->agent, '2026-04-29 23:59:00');

    $this->service->rollupDay(rollupDate());

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->deposit_clicks)->toBe(1);
});
