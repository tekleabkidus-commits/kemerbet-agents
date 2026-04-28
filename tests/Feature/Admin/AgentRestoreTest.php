<?php

use App\Models\Admin;
use App\Models\Agent;
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
// Auth
// =============================================================

test('returns 401 when unauthenticated', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->delete();

    $this->postJson("/api/admin/agents/{$agent->id}/restore")
        ->assertUnauthorized();
});

// =============================================================
// Validation
// =============================================================

test('returns 422 when restoring an active agent', function () {
    $agent = Agent::where('display_number', 1)->first();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/restore")
        ->assertUnprocessable()
        ->assertJson(['message' => 'Agent is not deleted.']);
});

test('returns 404 for non-existent agent id', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents/99999/restore')
        ->assertNotFound();
});

// =============================================================
// Successful restore
// =============================================================

test('restores soft-deleted agent with status disabled', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->delete();

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/restore");

    $response->assertOk();

    $data = $response->json('data');
    expect($data['status'])->toBe('disabled');
    expect($data['computed_status'])->toBe('disabled');
    expect($data['live_until'])->toBeNull();

    // Agent is no longer soft-deleted
    expect(Agent::find($agent->id))->not->toBeNull();
    expect(Agent::find($agent->id)->trashed())->toBeFalse();
});

test('assigns display_number as max plus one on restore', function () {
    // Seeded agents: 1-24, so max is 24
    $agent = Agent::where('display_number', 1)->first();
    $agent->delete();

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/restore");

    $response->assertOk();
    expect($response->json('data.display_number'))->toBe(25);
});

test('reactivates most recent token on restore', function () {
    $agent = Agent::where('display_number', 1)->first();

    // Create an older token that was revoked first
    $olderToken = $agent->tokens()->create([
        'token' => bin2hex(random_bytes(32)),
        'created_at' => now()->subDays(10),
        'revoked_at' => now()->subDays(7),
    ]);

    // Original active token (will be revoked when agent is deleted)
    $activeToken = $agent->tokens()->whereNull('revoked_at')->first();

    // Delete the agent — this revokes the active token
    $this->actingAs($this->admin)
        ->deleteJson("/api/admin/agents/{$agent->id}");

    // Restore
    $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/restore")
        ->assertOk();

    // The older token (revoked 7 days ago) should STAY revoked
    expect($olderToken->fresh()->revoked_at)->not->toBeNull();

    // The active token (revoked at deletion) should now be REACTIVATED
    expect($activeToken->fresh()->revoked_at)->toBeNull();
});

test('assigns fresh display_number even if old number is now taken', function () {
    $agent1 = Agent::where('display_number', 1)->first();
    $agent2 = Agent::where('display_number', 2)->first();

    // Delete agent 1
    $agent1->delete();

    // Give agent 2 the display_number 1 (now available due to soft-delete)
    $agent2->update(['display_number' => 1]);

    // Restore agent 1 — should get a fresh number, not collide with agent 2
    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent1->id}/restore");

    $response->assertOk();
    $restoredNumber = $response->json('data.display_number');

    // Should be max+1, not the old number 1
    expect($restoredNumber)->not->toBe(1);
    expect($restoredNumber)->toBeGreaterThan(24);
});

test('creates new token when restored agent has no tokens', function () {
    $agent = Agent::where('display_number', 1)->first();

    // Delete all tokens manually
    $agent->tokens()->delete();

    // Soft-delete the agent
    $agent->delete();

    // Restore
    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/restore");

    $response->assertOk();
    expect($response->json('data.active_token_url'))->not->toBeNull();
    expect($response->json('data.active_token_url'))->toStartWith(config('app.url').'/a/');

    // Should have exactly 1 active token
    $activeTokens = Agent::find($agent->id)->tokens()->whereNull('revoked_at')->count();
    expect($activeTokens)->toBe(1);
});

// =============================================================
// Status event audit
// =============================================================

test('logs restored_by_admin status_event with admin_id', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->delete();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/restore")
        ->assertOk();

    $this->assertDatabaseHas('status_events', [
        'agent_id' => $agent->id,
        'admin_id' => $this->admin->id,
        'event_type' => 'restored_by_admin',
    ]);
});
