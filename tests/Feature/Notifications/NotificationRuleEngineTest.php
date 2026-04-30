<?php

use App\Models\Agent;
use App\Models\AgentToken;
use App\Models\StatusEvent;
use App\Services\NotificationDispatcher;
use App\Services\NotificationRuleEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->agent = Agent::create([
        'display_number' => 7,
        'telegram_username' => 'RULETEST',
        'status' => 'active',
    ]);

    $this->tokenValue = bin2hex(random_bytes(32));
    AgentToken::create([
        'agent_id' => $this->agent->id,
        'token' => $this->tokenValue,
        'created_at' => now(),
    ]);

    $this->mockDispatcher = Mockery::mock(NotificationDispatcher::class);
    $this->engine = new NotificationRuleEngine($this->mockDispatcher);
});

afterEach(function () {
    Carbon::setTestNow();
    Mockery::close();
});

// =====================================================================
// isNighttime
// =====================================================================

// 1. 23:00 EAT = nighttime
it('returns true for 23:00 EAT', function () {
    // 23:00 EAT = 20:00 UTC
    $moment = Carbon::parse('2026-04-30 20:00:00', 'UTC');
    expect($this->engine->isNighttime($moment))->toBeTrue();
});

// 2. 03:00 EAT = nighttime
it('returns true for 03:00 EAT', function () {
    // 03:00 EAT = 00:00 UTC
    $moment = Carbon::parse('2026-05-01 00:00:00', 'UTC');
    expect($this->engine->isNighttime($moment))->toBeTrue();
});

// 3. 07:00 EAT = daytime
it('returns false for 07:00 EAT', function () {
    // 07:00 EAT = 04:00 UTC
    $moment = Carbon::parse('2026-04-30 04:00:00', 'UTC');
    expect($this->engine->isNighttime($moment))->toBeFalse();
});

// 4. 22:59 EAT = daytime
it('returns false for 22:59 EAT', function () {
    // 22:59 EAT = 19:59 UTC
    $moment = Carbon::parse('2026-04-30 19:59:00', 'UTC');
    expect($this->engine->isNighttime($moment))->toBeFalse();
});

// =====================================================================
// detectExpiredSessions
// =====================================================================

// 5. Writes session_expired event for expired session without offline event
it('writes session_expired for an expired session', function () {
    $liveUntil = Carbon::parse('2026-04-30 10:00:00');
    $this->agent->update(['live_until' => $liveUntil]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    $now = Carbon::parse('2026-04-30 10:05:00');
    $this->engine->detectExpiredSessions($now);

    $expired = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_SESSION_EXPIRED)
        ->first();

    expect($expired)->not->toBeNull();
});

// 6. session_expired created_at = live_until (not now)
it('sets session_expired created_at to live_until', function () {
    $liveUntil = Carbon::parse('2026-04-30 10:00:00');
    $this->agent->update(['live_until' => $liveUntil]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    $now = Carbon::parse('2026-04-30 10:05:00');
    $this->engine->detectExpiredSessions($now);

    $expired = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_SESSION_EXPIRED)
        ->sole();

    expect($expired->created_at->toDateTimeString())->toBe('2026-04-30 10:00:00');
});

// 7. Skips agents who already have session_expired after went_online
it('skips agents who already have a session_expired event', function () {
    $liveUntil = Carbon::parse('2026-04-30 10:00:00');
    $this->agent->update(['live_until' => $liveUntil]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_SESSION_EXPIRED,
        'created_at' => Carbon::parse('2026-04-30 10:00:00'),
    ]);

    $now = Carbon::parse('2026-04-30 10:05:00');
    $this->engine->detectExpiredSessions($now);

    $count = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_SESSION_EXPIRED)
        ->count();

    expect($count)->toBe(1);
});

// 8. Skips agents who self-clicked go offline
it('skips agents who went offline manually', function () {
    $liveUntil = Carbon::parse('2026-04-30 10:00:00');
    $this->agent->update(['live_until' => $liveUntil]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'created_at' => Carbon::parse('2026-04-30 09:30:00'),
    ]);

    $now = Carbon::parse('2026-04-30 10:05:00');
    $this->engine->detectExpiredSessions($now);

    $count = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_SESSION_EXPIRED)
        ->count();

    expect($count)->toBe(0);
});
