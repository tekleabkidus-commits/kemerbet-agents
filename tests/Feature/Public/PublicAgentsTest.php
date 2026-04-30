<?php

use App\Models\Agent;
use App\Models\PaymentMethod;
use App\Models\Setting;
use App\Models\StatusEvent;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function () {
    Cache::flush();
});

afterEach(function () {
    Carbon::setTestNow();
});

function publicAgentsUrl(): string
{
    return '/api/public/agents';
}

function createActiveAgent(array $attrs = []): Agent
{
    static $counter = 1;

    return Agent::create(array_merge([
        'display_number' => $counter++,
        'telegram_username' => 'agent'.$counter,
        'status' => Agent::STATUS_ACTIVE,
    ], $attrs));
}

// --- Test 1: response shape ---

it('returns correct response shape', function () {
    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonStructure([
            'cached_at',
            'live_count',
            'agents',
            'settings' => [
                'chat_prefilled_message',
                'show_offline_agents',
                'shuffle_live_agents',
            ],
        ]);
});

// --- Test 2: live agents included ---

it('includes live agents with status live', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $agent = createActiveAgent();
    $agent->update(['live_until' => now()->addMinutes(30)]);

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonPath('live_count', 1)
        ->assertJsonPath('agents.0.status', 'live')
        ->assertJsonPath('agents.0.id', $agent->id)
        ->assertJsonPath('agents.0.display_number', $agent->display_number)
        ->assertJsonPath('agents.0.telegram_username', $agent->telegram_username);

    // live agents should NOT have last_seen_at
    expect($response->json('agents.0'))->not->toHaveKey('last_seen_at');
});

// --- Test 3: recently offline agents included with last_seen_at ---

it('includes recently offline agents with last_seen_at ISO timestamp', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $agent = createActiveAgent();
    $agent->update(['live_until' => now()->subMinutes(10)]);

    StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'created_at' => now()->subMinutes(10),
    ]);

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonPath('live_count', 0)
        ->assertJsonPath('agents.0.status', 'recently_offline');

    expect($response->json('agents.0'))->toHaveKey('last_seen_at');

    // Verify it's a valid ISO timestamp
    $lastSeenAt = $response->json('agents.0.last_seen_at');
    expect(Carbon::parse($lastSeenAt))->toBeInstanceOf(Carbon::class);
});

// --- Test 4: agents offline over 30 min excluded ---

it('excludes agents whose last went_offline was over 30 minutes ago', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $agent = createActiveAgent();
    $agent->update(['live_until' => now()->subMinutes(45)]);

    StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'created_at' => now()->subMinutes(31),
    ]);

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonPath('live_count', 0)
        ->assertJsonPath('agents', []);
});

// --- Test 4b: session_expired agents counted as recently_offline ---

it('treats session_expired events as recently offline', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $agent = createActiveAgent();
    $agent->update(['live_until' => now()->subMinutes(10)]);

    StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => StatusEvent::EVENT_SESSION_EXPIRED,
        'created_at' => now()->subMinutes(10),
    ]);

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonPath('live_count', 0)
        ->assertJsonPath('agents.0.status', 'recently_offline');

    expect($response->json('agents.0'))->toHaveKey('last_seen_at');
});

// --- Test 5: disabled agents excluded ---

it('excludes disabled agents', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $agent = createActiveAgent([
        'status' => Agent::STATUS_DISABLED,
    ]);
    $agent->update(['live_until' => now()->addMinutes(30)]);

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonPath('agents', []);
});

// --- Test 6: soft-deleted agents excluded ---

it('excludes soft-deleted agents', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $agent = createActiveAgent();
    $agent->update(['live_until' => now()->addMinutes(30)]);
    $agent->delete();

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonPath('agents', []);
});

// --- Test 7: payment methods included ---

it('includes payment methods with slug and display_name', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $agent = createActiveAgent();
    $agent->update(['live_until' => now()->addMinutes(30)]);

    $pm = PaymentMethod::create([
        'slug' => 'cbe',
        'display_name' => 'CBE',
        'display_order' => 1,
        'is_active' => true,
    ]);
    $agent->paymentMethods()->attach($pm->id);

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonPath('agents.0.payment_methods.0.slug', 'cbe')
        ->assertJsonPath('agents.0.payment_methods.0.display_name', 'CBE');

    // Should NOT include id in payment method
    expect($response->json('agents.0.payment_methods.0'))->not->toHaveKey('id');
});

// --- Test 8: live agents sorted before recently offline ---

it('returns live agents before recently offline agents', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $offline = createActiveAgent(['display_number' => 1]);
    $offline->update(['live_until' => now()->subMinutes(5)]);
    StatusEvent::create([
        'agent_id' => $offline->id,
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'created_at' => now()->subMinutes(5),
    ]);

    $live = createActiveAgent(['display_number' => 2]);
    $live->update(['live_until' => now()->addMinutes(30)]);

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk();

    $agents = $response->json('agents');
    expect($agents)->toHaveCount(2);
    expect($agents[0]['status'])->toBe('live');
    expect($agents[1]['status'])->toBe('recently_offline');
});

// --- Test 9: settings include prefill message ---

it('returns settings with chat_prefilled_message', function () {
    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk();

    // Default when no settings seeded
    expect($response->json('settings.chat_prefilled_message'))
        ->toBe('Hi Kemerbet agent, I want to deposit');
});

// --- Test 10: settings with seeded prefill message ---

it('returns seeded prefill message from settings table', function () {
    Setting::create([
        'key' => 'prefill_message',
        'value' => 'Custom deposit message',
    ]);

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonPath('settings.chat_prefilled_message', 'Custom deposit message');
});

// --- Test 11: response is cached for 60s ---

it('caches response for 60 seconds', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $response1 = $this->getJson(publicAgentsUrl());
    $cachedAt1 = $response1->json('cached_at');

    Carbon::setTestNow('2026-04-29 12:00:30');

    $response2 = $this->getJson(publicAgentsUrl());
    $cachedAt2 = $response2->json('cached_at');

    expect($cachedAt1)->toBe($cachedAt2);
});

// --- Test 12: show_offline_agents setting respected ---

it('excludes recently offline agents when show_offline_agents is false', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    Setting::create([
        'key' => 'show_offline_agents',
        'value' => false,
    ]);

    $agent = createActiveAgent();
    $agent->update(['live_until' => now()->subMinutes(5)]);
    StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'created_at' => now()->subMinutes(5),
    ]);

    $response = $this->getJson(publicAgentsUrl());

    $response->assertOk()
        ->assertJsonPath('agents', [])
        ->assertJsonPath('settings.show_offline_agents', false);
});

// --- Test 13: live agents ordered by display_number ---

it('returns live agents sorted by display_number ascending', function () {
    Carbon::setTestNow('2026-04-29 12:00:00');

    $agent3 = createActiveAgent(['display_number' => 30]);
    $agent3->update(['live_until' => now()->addMinutes(30)]);

    $agent1 = createActiveAgent(['display_number' => 10]);
    $agent1->update(['live_until' => now()->addMinutes(30)]);

    $agent2 = createActiveAgent(['display_number' => 20]);
    $agent2->update(['live_until' => now()->addMinutes(30)]);

    $response = $this->getJson(publicAgentsUrl());

    $agents = $response->json('agents');
    expect($agents[0]['display_number'])->toBe(10);
    expect($agents[1]['display_number'])->toBe(20);
    expect($agents[2]['display_number'])->toBe(30);
});
