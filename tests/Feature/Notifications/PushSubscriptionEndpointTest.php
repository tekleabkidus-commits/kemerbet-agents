<?php

use App\Models\Agent;
use App\Models\AgentToken;
use App\Models\PushSubscription;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->agent = Agent::create([
        'display_number' => 7,
        'telegram_username' => 'PUSHTEST',
        'status' => 'active',
    ]);

    $this->tokenValue = bin2hex(random_bytes(32));
    AgentToken::create([
        'agent_id' => $this->agent->id,
        'token' => $this->tokenValue,
        'created_at' => now(),
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
});

function subscribeUrl(string $token): string
{
    return "/api/agent/{$token}/subscribe";
}

function subscribePayload(array $overrides = []): array
{
    return array_merge([
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
        'p256dh_key' => str_repeat('A', 88),
        'auth_key' => str_repeat('B', 24),
    ], $overrides);
}

// 1. POST subscribe creates active row with all fields populated
it('creates an active push subscription on POST', function () {
    $this->postJson(subscribeUrl($this->tokenValue), subscribePayload([
        'user_agent' => 'TestBrowser/1.0',
    ]))->assertOk()->assertJson(['ok' => true]);

    $sub = PushSubscription::where('agent_id', $this->agent->id)->sole();
    expect($sub->endpoint)->toBe('https://fcm.googleapis.com/fcm/send/test-endpoint-123')
        ->and($sub->p256dh_key)->toBe(str_repeat('A', 88))
        ->and($sub->auth_key)->toBe(str_repeat('B', 24))
        ->and($sub->user_agent)->toBe('TestBrowser/1.0')
        ->and($sub->is_active)->toBeTrue()
        ->and($sub->last_used_at)->not->toBeNull();
});

// 2. POST upsert: same agent+endpoint twice = 1 row, not 2
it('upserts instead of duplicating on repeated POST', function () {
    $this->postJson(subscribeUrl($this->tokenValue), subscribePayload());
    $this->postJson(subscribeUrl($this->tokenValue), subscribePayload());

    expect(PushSubscription::where('agent_id', $this->agent->id)->count())->toBe(1);
});

// 3. POST upsert updates p256dh_key and auth_key when keys change
it('updates keys on re-subscribe', function () {
    $this->postJson(subscribeUrl($this->tokenValue), subscribePayload());

    $this->postJson(subscribeUrl($this->tokenValue), subscribePayload([
        'p256dh_key' => 'NEW-P256DH-KEY',
        'auth_key' => 'NEW-AUTH-KEY',
    ]))->assertOk();

    $sub = PushSubscription::where('agent_id', $this->agent->id)->sole();
    expect($sub->p256dh_key)->toBe('NEW-P256DH-KEY')
        ->and($sub->auth_key)->toBe('NEW-AUTH-KEY');
});

// 4. POST upsert refreshes last_used_at on re-subscribe
it('refreshes last_used_at on re-subscribe', function () {
    Carbon::setTestNow('2026-04-30 10:00:00');
    $this->postJson(subscribeUrl($this->tokenValue), subscribePayload());

    Carbon::setTestNow('2026-04-30 11:00:00');
    $this->postJson(subscribeUrl($this->tokenValue), subscribePayload());

    $sub = PushSubscription::where('agent_id', $this->agent->id)->sole();
    expect($sub->last_used_at->toDateTimeString())->toBe('2026-04-30 11:00:00');
});

// 5. POST re-subscribe reactivates inactive row and clears failed_at
it('reactivates an inactive subscription on re-subscribe', function () {
    $sub = PushSubscription::factory()->for($this->agent)->create([
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
        'is_active' => false,
        'failed_at' => now(),
    ]);

    $this->postJson(subscribeUrl($this->tokenValue), subscribePayload())->assertOk();

    $sub->refresh();
    expect($sub->is_active)->toBeTrue()
        ->and($sub->failed_at)->toBeNull();
});

// 6. DELETE marks is_active=false but preserves the row
it('soft-deactivates subscription on DELETE', function () {
    PushSubscription::factory()->for($this->agent)->create([
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
    ]);

    $this->deleteJson(subscribeUrl($this->tokenValue), [
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
    ])->assertOk()->assertJson(['ok' => true]);

    $sub = PushSubscription::where('agent_id', $this->agent->id)->sole();
    expect($sub->is_active)->toBeFalse();
});

// 7. DELETE for non-matching endpoint is idempotent 200, original row untouched
it('returns 200 on DELETE for non-existent endpoint', function () {
    PushSubscription::factory()->for($this->agent)->create([
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/original',
        'is_active' => true,
    ]);

    $this->deleteJson(subscribeUrl($this->tokenValue), [
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/other',
    ])->assertOk();

    $sub = PushSubscription::where('agent_id', $this->agent->id)->sole();
    expect($sub->is_active)->toBeTrue();
});

// 8. DELETE only affects matching (agent_id, endpoint) — cross-agent isolation
it('does not affect another agent subscription on DELETE', function () {
    $agentB = Agent::create([
        'display_number' => 8,
        'telegram_username' => 'AGENTB',
        'status' => 'active',
    ]);

    $sharedEndpoint = 'https://fcm.googleapis.com/fcm/send/shared-endpoint';

    PushSubscription::factory()->for($this->agent)->create([
        'endpoint' => $sharedEndpoint,
        'is_active' => true,
    ]);
    PushSubscription::factory()->for($agentB)->create([
        'endpoint' => $sharedEndpoint,
        'is_active' => true,
    ]);

    $this->deleteJson(subscribeUrl($this->tokenValue), [
        'endpoint' => $sharedEndpoint,
    ])->assertOk();

    // Agent A's subscription deactivated
    expect(PushSubscription::where('agent_id', $this->agent->id)->sole()->is_active)->toBeFalse();
    // Agent B's subscription untouched
    expect(PushSubscription::where('agent_id', $agentB->id)->sole()->is_active)->toBeTrue();
});

// 9. POST with invalid token returns 404
it('returns 404 for invalid token on POST', function () {
    $bogus = str_repeat('a', 64);
    $this->postJson(subscribeUrl($bogus), subscribePayload())->assertNotFound();
});

// 10. DELETE with invalid token returns 404
it('returns 404 for invalid token on DELETE', function () {
    $bogus = str_repeat('a', 64);
    $this->deleteJson(subscribeUrl($bogus), [
        'endpoint' => 'https://example.com/push',
    ])->assertNotFound();
});

// 11. POST with disabled agent returns 422
it('returns 422 for disabled agent on POST', function () {
    $this->agent->update(['status' => Agent::STATUS_DISABLED]);

    $this->postJson(subscribeUrl($this->tokenValue), subscribePayload())
        ->assertStatus(422)
        ->assertJson(['message' => 'Your account has been disabled.']);
});

// 12. POST validation: missing required fields return 422
it('returns 422 when required fields are missing', function () {
    $this->postJson(subscribeUrl($this->tokenValue), [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['endpoint', 'p256dh_key', 'auth_key']);
});
