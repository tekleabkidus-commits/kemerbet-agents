<?php

use App\Models\Admin;
use App\Models\Agent;
use App\Models\StatusEvent;
use Database\Seeders\AgentSeeder;
use Database\Seeders\PaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
        'name' => 'Kidus',
    ]);

    $this->withHeaders(['Origin' => 'http://localhost:8001']);

    $this->seed(PaymentMethodSeeder::class);
    $this->seed(AgentSeeder::class);
});

// =============================================================
// Disable
// =============================================================

test('disable unauthenticated returns 401', function () {
    $agent = Agent::where('display_number', 1)->first();

    $this->postJson("/api/admin/agents/{$agent->id}/disable")
        ->assertUnauthorized();
});

test('disable active agent sets status to disabled and clears live_until', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update([
        'status' => 'active',
        'live_until' => now()->addHour(),
    ]);

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/disable");

    $response->assertOk();
    expect($response->json('data.status'))->toBe('disabled');
    expect($response->json('data.computed_status'))->toBe('disabled');
    expect($response->json('data.live_until'))->toBeNull();

    $fresh = Agent::find($agent->id);
    expect($fresh->status)->toBe('disabled');
    expect($fresh->live_until)->toBeNull();
    expect($fresh->last_status_change_at)->not->toBeNull();

    $event = StatusEvent::where('agent_id', $agent->id)
        ->where('event_type', 'disabled_by_admin')
        ->first();
    expect($event)->not->toBeNull();
    expect($event->admin_id)->toBe($this->admin->id);
    expect($event->ip_address)->not->toBeNull();
});

test('disable already-disabled agent is idempotent and does not log a new event', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['status' => 'disabled']);

    $eventCountBefore = $agent->statusEvents()->count();

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/disable");

    $response->assertOk();
    expect($agent->statusEvents()->count())->toBe($eventCountBefore);
});

test('disable nonexistent agent returns 404', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents/99999/disable')
        ->assertNotFound();
});

test('disable soft-deleted agent returns 404', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->delete();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/disable")
        ->assertNotFound();
});

// =============================================================
// Enable
// =============================================================

test('enable unauthenticated returns 401', function () {
    $agent = Agent::where('display_number', 1)->first();

    $this->postJson("/api/admin/agents/{$agent->id}/enable")
        ->assertUnauthorized();
});

test('enable disabled agent sets status to active and logs event', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['status' => 'disabled']);

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/enable");

    $response->assertOk();
    expect($response->json('data.status'))->toBe('active');
    expect($response->json('data.computed_status'))->toBe('offline');

    expect(Agent::find($agent->id)->status)->toBe('active');

    $event = StatusEvent::where('agent_id', $agent->id)
        ->where('event_type', 'enabled_by_admin')
        ->first();
    expect($event)->not->toBeNull();
    expect($event->admin_id)->toBe($this->admin->id);
});

test('enable already-active agent is idempotent and does not log a new event', function () {
    $agent = Agent::where('display_number', 1)->first();
    expect($agent->status)->toBe('active');

    $eventCountBefore = $agent->statusEvents()->count();

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/enable");

    $response->assertOk();
    expect($agent->statusEvents()->count())->toBe($eventCountBefore);
});

// =============================================================
// Regenerate Token
// =============================================================

test('regenerate-token unauthenticated returns 401', function () {
    $agent = Agent::where('display_number', 1)->first();

    $this->postJson("/api/admin/agents/{$agent->id}/regenerate-token")
        ->assertUnauthorized();
});

test('regenerate-token revokes old token, creates new, clears live_until, logs event', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['live_until' => now()->addHour()]);

    $oldToken = $agent->activeToken;
    expect($oldToken)->not->toBeNull();
    $oldTokenValue = $oldToken->token;

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/regenerate-token");

    $response->assertOk();

    // Old token is revoked
    $oldToken->refresh();
    expect($oldToken->revoked_at)->not->toBeNull();

    // New token exists and is different
    $newToken = $agent->fresh()->activeToken;
    expect($newToken)->not->toBeNull();
    expect($newToken->token)->not->toBe($oldTokenValue);
    expect($newToken->revoked_at)->toBeNull();

    // Agent forced offline
    expect(Agent::find($agent->id)->live_until)->toBeNull();

    // Status event logged
    $event = StatusEvent::where('agent_id', $agent->id)
        ->where('event_type', 'token_regenerated')
        ->first();
    expect($event)->not->toBeNull();
    expect($event->admin_id)->toBe($this->admin->id);

    // Response includes new token URL
    $url = $response->json('data.active_token_url');
    expect($url)->toStartWith(config('app.url').'/a/');
    expect($url)->toContain($newToken->token);
    expect($url)->not->toContain($oldTokenValue);
});

test('regenerate-token returns new token in active_token_url not old', function () {
    $agent = Agent::where('display_number', 1)->first();

    // First regeneration
    $response1 = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/regenerate-token");
    $url1 = $response1->json('data.active_token_url');

    // Second regeneration
    $response2 = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/regenerate-token");
    $url2 = $response2->json('data.active_token_url');

    expect($url1)->not->toBe($url2);
    expect($url2)->toStartWith(config('app.url').'/a/');
});

test('regenerate-token nonexistent agent returns 404', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents/99999/regenerate-token')
        ->assertNotFound();
});

// =============================================================
// Destroy
// =============================================================

test('destroy unauthenticated returns 401', function () {
    $agent = Agent::where('display_number', 1)->first();

    $this->deleteJson("/api/admin/agents/{$agent->id}")
        ->assertUnauthorized();
});

test('destroy soft-deletes agent and revokes all tokens', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['live_until' => now()->addHour()]);

    $activeToken = $agent->activeToken;
    expect($activeToken)->not->toBeNull();

    $response = $this->actingAs($this->admin)
        ->deleteJson("/api/admin/agents/{$agent->id}");

    $response->assertOk();

    // Agent is soft-deleted
    expect(Agent::find($agent->id))->toBeNull();
    expect(Agent::withTrashed()->find($agent->id)->deleted_at)->not->toBeNull();

    // All tokens revoked
    $unrevokedCount = $agent->tokens()->whereNull('revoked_at')->count();
    expect($unrevokedCount)->toBe(0);

    // Status event logged
    $event = StatusEvent::where('agent_id', $agent->id)
        ->where('event_type', 'deleted_by_admin')
        ->first();
    expect($event)->not->toBeNull();
    expect($event->admin_id)->toBe($this->admin->id);

    // Excluded from default listing
    $listResponse = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents');
    $ids = collect($listResponse->json('data'))->pluck('id')->all();
    expect($ids)->not->toContain($agent->id);

    // Included in deleted filter
    $deletedResponse = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?status=deleted');
    $deletedIds = collect($deletedResponse->json('data'))->pluck('id')->all();
    expect($deletedIds)->toContain($agent->id);
});

test('destroy nonexistent agent returns 404', function () {
    $this->actingAs($this->admin)
        ->deleteJson('/api/admin/agents/99999')
        ->assertNotFound();
});
