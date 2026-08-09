<?php

use App\Models\Admin;
use App\Models\Agent;
use Database\Seeders\AgentSeeder;
use Database\Seeders\PaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

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

    Cache::flush();
});

// =============================================================
// Pin toggle
// =============================================================

test('pin unauthenticated returns 401', function () {
    $agent = Agent::where('display_number', 1)->first();

    $this->postJson("/api/admin/agents/{$agent->id}/pin")
        ->assertUnauthorized();
});

test('pin sets pinned_at on a live agent', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['live_until' => now()->addHour()]);
    expect($agent->fresh()->pinned_at)->toBeNull();

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/pin");

    $response->assertOk();
    expect($response->json('data.is_pinned'))->toBeTrue();
    expect($response->json('data.pinned_at'))->not->toBeNull();
    expect($agent->fresh()->pinned_at)->not->toBeNull();
});

test('pin on an offline agent returns 422', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['live_until' => null]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/pin")
        ->assertStatus(422)
        ->assertJson(['message' => 'Agent must be online to pin']);

    expect($agent->fresh()->pinned_at)->toBeNull();
});

test('pin on a disabled agent returns 422', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['status' => Agent::STATUS_DISABLED, 'live_until' => null]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/pin")
        ->assertStatus(422)
        ->assertJson(['message' => 'Agent must be online to pin']);
});

test('pin on a pinned agent unpins it', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['live_until' => now()->addHour(), 'pinned_at' => now()]);

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/pin");

    $response->assertOk();
    expect($response->json('data.is_pinned'))->toBeFalse();
    expect($response->json('data.pinned_at'))->toBeNull();
    expect($agent->fresh()->pinned_at)->toBeNull();
});

test('unpinning is allowed even when the agent is offline', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['live_until' => null, 'pinned_at' => now()]);

    $response = $this->actingAs($this->admin)
        ->postJson("/api/admin/agents/{$agent->id}/pin");

    $response->assertOk();
    expect($response->json('data.is_pinned'))->toBeFalse();
    expect($agent->fresh()->pinned_at)->toBeNull();
});

// =============================================================
// Admin list ordering
// =============================================================

test('admin agents list shows pinned live agents first ordered by oldest pin', function () {
    $first = Agent::where('display_number', 5)->first();
    $first->update(['live_until' => now()->addHour(), 'pinned_at' => now()->subMinutes(10)]);

    $second = Agent::where('display_number', 9)->first();
    $second->update(['live_until' => now()->addHour(), 'pinned_at' => now()->subMinutes(5)]);

    $response = $this->actingAs($this->admin)->getJson('/api/admin/agents?per_page=100');

    $response->assertOk();
    $data = $response->json('data');
    expect($data[0]['id'])->toBe($first->id);
    expect($data[0]['is_pinned'])->toBeTrue();
    expect($data[1]['id'])->toBe($second->id);
    expect($data[1]['is_pinned'])->toBeTrue();
});

test('pinned agent that is not live gets no priority in admin list', function () {
    $pinnedOffline = Agent::where('display_number', 5)->first();
    $pinnedOffline->update(['live_until' => null, 'pinned_at' => now()]);

    $response = $this->actingAs($this->admin)->getJson('/api/admin/agents?per_page=100');

    $response->assertOk();
    $data = $response->json('data');
    // Existing sort is display_number ASC, so agent 1 stays on top.
    expect($data[0]['display_number'])->toBe(1);
    expect(collect($data)->firstWhere('id', $pinnedOffline->id)['is_pinned'])->toBeTrue();
});

// =============================================================
// Public list ordering
// =============================================================

test('public agents list shows pinned live agents first ordered by oldest pin', function () {
    Agent::query()->update(['live_until' => null, 'pinned_at' => null]);

    $unpinnedLive = Agent::where('display_number', 1)->first();
    $unpinnedLive->update(['live_until' => now()->addHour()]);

    $firstPinned = Agent::where('display_number', 9)->first();
    $firstPinned->update(['live_until' => now()->addHour(), 'pinned_at' => now()->subMinutes(10)]);

    $secondPinned = Agent::where('display_number', 7)->first();
    $secondPinned->update(['live_until' => now()->addHour(), 'pinned_at' => now()->subMinutes(5)]);

    Cache::flush();
    $response = $this->getJson('/api/public/agents');

    $response->assertOk();
    $agents = collect($response->json('agents'))->where('status', 'live')->values();

    expect($agents[0]['id'])->toBe($firstPinned->id);
    expect($agents[0]['is_pinned'])->toBeTrue();
    expect($agents[1]['id'])->toBe($secondPinned->id);
    expect($agents[2]['id'])->toBe($unpinnedLive->id);
    expect($agents[2]['is_pinned'])->toBeFalse();
});
