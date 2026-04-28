<?php

use App\Models\Agent;
use App\Models\AgentToken;
use App\Models\StatusEvent;
use Carbon\Carbon;
use Database\Seeders\PaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PaymentMethodSeeder::class);

    $this->agent = Agent::create([
        'display_number' => 7,
        'telegram_username' => 'DOITFAST21',
        'status' => 'active',
    ]);

    $this->tokenValue = bin2hex(random_bytes(32));
    $this->agentToken = AgentToken::create([
        'agent_id' => $this->agent->id,
        'token' => $this->tokenValue,
        'created_at' => now(),
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
});

function stateUrl(string $token): string
{
    return "/api/agent/{$token}/state";
}

function goOnlineUrl(string $token): string
{
    return "/api/agent/{$token}/go-online";
}

function extendUrl(string $token): string
{
    return "/api/agent/{$token}/extend";
}

function goOfflineUrl(string $token): string
{
    return "/api/agent/{$token}/go-offline";
}

// =============================================================
// Token validation
// =============================================================

test('returns 200 with state for valid token', function () {
    $response = $this->getJson(stateUrl($this->tokenValue));

    $response->assertOk()
        ->assertJsonPath('agent.display_number', 7)
        ->assertJsonPath('agent.telegram_username', 'DOITFAST21')
        ->assertJsonPath('agent.is_disabled', false)
        ->assertJsonPath('status.is_live', false)
        ->assertJsonStructure([
            'agent' => ['display_number', 'telegram_username', 'is_disabled'],
            'status' => ['is_live', 'live_until', 'total_duration_minutes'],
            'metrics' => ['clicks_today', 'clicks_yesterday', 'live_time_today_minutes', 'sessions_today'],
            'recent_activity',
            'available_durations',
            'recommended_duration',
            'token_suffix',
        ]);
});

test('returns 404 for invalid token', function () {
    $fakeToken = bin2hex(random_bytes(32));

    $this->getJson(stateUrl($fakeToken))
        ->assertNotFound();
});

test('returns 404 for revoked token', function () {
    $this->agentToken->update(['revoked_at' => now()]);

    $this->getJson(stateUrl($this->tokenValue))
        ->assertNotFound();
});

// =============================================================
// State endpoint
// =============================================================

test('returns reduced payload with is_disabled true for disabled agent', function () {
    $this->agent->update(['status' => 'disabled']);

    $response = $this->getJson(stateUrl($this->tokenValue));

    $response->assertOk()
        ->assertJsonPath('agent.is_disabled', true)
        ->assertJsonPath('agent.display_number', 7)
        ->assertJsonMissing(['status'])
        ->assertJsonMissing(['metrics'])
        ->assertJsonMissing(['recent_activity']);
});

test('includes is_live true and live_until for live agent', function () {
    $this->agent->update(['live_until' => now()->addHour()]);

    $response = $this->getJson(stateUrl($this->tokenValue));

    $response->assertOk()
        ->assertJsonPath('status.is_live', true);

    expect($response->json('status.live_until'))->not->toBeNull();
});

test('includes is_live false and null live_until for offline agent', function () {
    $response = $this->getJson(stateUrl($this->tokenValue));

    $response->assertOk()
        ->assertJsonPath('status.is_live', false)
        ->assertJsonPath('status.live_until', null)
        ->assertJsonPath('status.total_duration_minutes', null);
});

test('includes available_durations and recommended_duration based on time of day', function () {
    // Daytime: 2 PM in Addis Ababa (UTC+3 → 11 AM UTC)
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 11, 0, 0, 'UTC'));

    $response = $this->getJson(stateUrl($this->tokenValue));

    $response->assertOk();
    expect($response->json('available_durations'))->toBe([15, 30, 45, 60, 120]);
    expect($response->json('recommended_duration'))->toBe(120);

    // Sleeping hours: 11:30 PM in Addis Ababa (UTC+3 → 8:30 PM UTC)
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 20, 30, 0, 'UTC'));

    $response = $this->getJson(stateUrl($this->tokenValue));

    $response->assertOk();
    expect($response->json('available_durations'))->toBe([15, 30, 45, 60]);
    expect($response->json('recommended_duration'))->toBeNull();
});

// =============================================================
// Go-online
// =============================================================

test('returns 200 and sets live_until when offline agent goes online', function () {
    // Freeze at daytime
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 11, 0, 0, 'UTC'));

    $response = $this->postJson(goOnlineUrl($this->tokenValue), [
        'duration_minutes' => 60,
    ]);

    $response->assertOk()
        ->assertJsonPath('status.is_live', true)
        ->assertJsonPath('status.total_duration_minutes', 60);

    expect($response->json('status.live_until'))->not->toBeNull();

    $fresh = Agent::find($this->agent->id);
    expect($fresh->isLive())->toBeTrue();
});

test('logs went_online status_event with duration_minutes', function () {
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 11, 0, 0, 'UTC'));

    $this->postJson(goOnlineUrl($this->tokenValue), [
        'duration_minutes' => 120,
    ]);

    $event = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_WENT_ONLINE)
        ->first();

    expect($event)->not->toBeNull();
    expect($event->duration_minutes)->toBe(120);
    expect($event->ip_address)->not->toBeNull();
});

test('returns 422 for invalid duration', function () {
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 11, 0, 0, 'UTC'));

    // 90 is not in the allowed list
    $this->postJson(goOnlineUrl($this->tokenValue), [
        'duration_minutes' => 90,
    ])->assertUnprocessable();

    // 120 during sleeping hours
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 20, 30, 0, 'UTC'));

    $this->postJson(goOnlineUrl($this->tokenValue), [
        'duration_minutes' => 120,
    ])->assertUnprocessable();
});

// =============================================================
// Extend
// =============================================================

test('returns 200 and resets live_until when live agent extends', function () {
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 11, 0, 0, 'UTC'));

    $this->agent->update(['live_until' => now()->addMinutes(30)]);

    $response = $this->postJson(extendUrl($this->tokenValue), [
        'duration_minutes' => 120,
    ]);

    $response->assertOk()
        ->assertJsonPath('status.is_live', true)
        ->assertJsonPath('status.total_duration_minutes', 120);

    $fresh = Agent::find($this->agent->id);
    // Strict replacement: live_until should be ~now + 120 min, not now + 30 + 120
    $expectedEnd = now()->addMinutes(120);
    expect($fresh->live_until->diffInSeconds($expectedEnd))->toBeLessThan(5);
});

test('returns 422 when offline agent attempts extend', function () {
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 11, 0, 0, 'UTC'));

    $response = $this->postJson(extendUrl($this->tokenValue), [
        'duration_minutes' => 60,
    ]);

    $response->assertUnprocessable()
        ->assertJsonPath('message', 'You must be online to extend.');
});

test('logs extended status_event', function () {
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 11, 0, 0, 'UTC'));

    $this->agent->update(['live_until' => now()->addHour()]);

    $this->postJson(extendUrl($this->tokenValue), [
        'duration_minutes' => 30,
    ]);

    $event = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_EXTENDED)
        ->first();

    expect($event)->not->toBeNull();
    expect($event->duration_minutes)->toBe(30);
});

// =============================================================
// Go-offline
// =============================================================

test('returns 200 and clears live_until when live agent goes offline', function () {
    $this->agent->update(['live_until' => now()->addHour()]);

    $response = $this->postJson(goOfflineUrl($this->tokenValue));

    $response->assertOk()
        ->assertJsonPath('status.is_live', false)
        ->assertJsonPath('status.live_until', null);

    $fresh = Agent::find($this->agent->id);
    expect($fresh->live_until)->toBeNull();
});

test('does not log duplicate event for already-offline agent', function () {
    $eventCountBefore = StatusEvent::where('agent_id', $this->agent->id)->count();

    $response = $this->postJson(goOfflineUrl($this->tokenValue));

    $response->assertOk()
        ->assertJsonPath('status.is_live', false);

    $eventCountAfter = StatusEvent::where('agent_id', $this->agent->id)->count();
    expect($eventCountAfter)->toBe($eventCountBefore);
});

test('logs went_offline event when previously live', function () {
    $this->agent->update(['live_until' => now()->addHour()]);

    $this->postJson(goOfflineUrl($this->tokenValue));

    $event = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_WENT_OFFLINE)
        ->first();

    expect($event)->not->toBeNull();
    expect($event->ip_address)->not->toBeNull();
});

// =============================================================
// Edge cases
// =============================================================

test('updates last_used_at on token after API call', function () {
    expect($this->agentToken->last_used_at)->toBeNull();

    $this->getJson(stateUrl($this->tokenValue))->assertOk();

    $this->agentToken->refresh();
    expect($this->agentToken->last_used_at)->not->toBeNull();
});

test('correctly computes live_time_today_minutes including overnight session straddling midnight', function () {
    // Set "now" to 6:00 AM Addis Ababa (3:00 AM UTC) on April 28
    Carbon::setTestNow(Carbon::create(2026, 4, 28, 3, 0, 0, 'UTC'));

    // Agent went online yesterday at 10 PM Addis (7 PM UTC = April 27 19:00 UTC)
    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 120,
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::create(2026, 4, 27, 19, 0, 0, 'UTC'),
    ]);

    // Agent is still live (live_until in the future)
    $this->agent->update(['live_until' => now()->addHour()]);

    $response = $this->getJson(stateUrl($this->tokenValue));

    $response->assertOk();

    // Midnight Addis = 9 PM UTC April 27 = 2026-04-27 21:00 UTC
    // Now = 3:00 AM UTC April 28
    // Expected: 6 hours (midnight to 6 AM) = 360 minutes
    $liveMinutes = $response->json('metrics.live_time_today_minutes');
    expect($liveMinutes)->toBeGreaterThanOrEqual(359)
        ->toBeLessThanOrEqual(361);
});
