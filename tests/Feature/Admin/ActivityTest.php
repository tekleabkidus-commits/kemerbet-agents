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
// Auth
// =============================================================

test('returns 401 when unauthenticated', function () {
    $this->getJson('/api/admin/activity')
        ->assertUnauthorized();
});

// =============================================================
// Default listing
// =============================================================

test('returns paginated list sorted by created_at desc by default', function () {
    $agent = Agent::where('display_number', 1)->first();

    // Create events with distinct timestamps
    $agent->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now()->subHours(2),
    ]);

    $agent->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now()->subHour(),
    ]);

    $agent->statusEvents()->create([
        'admin_id' => $this->admin->id,
        'event_type' => StatusEvent::EVENT_DISABLED_BY_ADMIN,
        'ip_address' => '5.6.7.8',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/activity');

    $response->assertOk();
    $response->assertJsonStructure([
        'data' => [['id', 'agent_id', 'agent', 'admin_id', 'admin', 'event_type', 'duration_minutes', 'ip_address', 'created_at']],
        'meta' => ['current_page', 'last_page', 'per_page', 'total'],
    ]);

    $data = $response->json('data');
    expect($data)->toHaveCount(3);

    // Newest first
    expect($data[0]['event_type'])->toBe('disabled_by_admin');
    expect($data[2]['event_type'])->toBe('went_online');
});

// =============================================================
// Filters
// =============================================================

test('filters by single event_type', function () {
    $agent = Agent::where('display_number', 1)->first();

    $agent->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now(),
    ]);

    $agent->statusEvents()->create([
        'admin_id' => $this->admin->id,
        'event_type' => StatusEvent::EVENT_DISABLED_BY_ADMIN,
        'ip_address' => '5.6.7.8',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/activity?event_type[]=went_online');

    $response->assertOk();
    $data = $response->json('data');
    expect($data)->toHaveCount(1);
    expect($data[0]['event_type'])->toBe('went_online');
});

test('filters by multiple event_types', function () {
    $agent = Agent::where('display_number', 1)->first();

    $agent->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now(),
    ]);

    $agent->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now(),
    ]);

    $agent->statusEvents()->create([
        'admin_id' => $this->admin->id,
        'event_type' => StatusEvent::EVENT_DISABLED_BY_ADMIN,
        'ip_address' => '5.6.7.8',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/activity?event_type[]=went_online&event_type[]=went_offline');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(2);
});

test('filters by admin_id', function () {
    $agent = Agent::where('display_number', 1)->first();

    $agent->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now(),
    ]);

    $agent->statusEvents()->create([
        'admin_id' => $this->admin->id,
        'event_type' => StatusEvent::EVENT_DISABLED_BY_ADMIN,
        'ip_address' => '5.6.7.8',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/activity?admin_id={$this->admin->id}");

    $response->assertOk();
    $data = $response->json('data');
    expect($data)->toHaveCount(1);
    expect($data[0]['event_type'])->toBe('disabled_by_admin');
});

test('filters by agent_id', function () {
    $agent1 = Agent::where('display_number', 1)->first();
    $agent2 = Agent::where('display_number', 2)->first();

    $agent1->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now(),
    ]);

    $agent2->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/activity?agent_id={$agent1->id}");

    $response->assertOk();
    $data = $response->json('data');
    expect($data)->toHaveCount(1);
    expect($data[0]['agent_id'])->toBe($agent1->id);
});

test('filters by date range', function () {
    $agent = Agent::where('display_number', 1)->first();

    $agent->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now()->subDays(5),
    ]);

    $agent->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now()->subDay(),
    ]);

    $agent->statusEvents()->create([
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'ip_address' => '1.2.3.4',
        'created_at' => now(),
    ]);

    $from = now()->subDays(2)->toDateString();
    $to = now()->toDateString();

    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/activity?date_from={$from}&date_to={$to}");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(2);
});

// =============================================================
// Validation
// =============================================================

test('returns 422 for invalid event_type value', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/activity?event_type[]=bogus_event')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['event_type.0']);
});

test('returns 422 for invalid date format', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/activity?date_from=not-a-date')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['date_from']);
});

// =============================================================
// Eager loading
// =============================================================

test('includes eager-loaded agent and admin in response', function () {
    $agent = Agent::where('display_number', 1)->first();

    $agent->statusEvents()->create([
        'admin_id' => $this->admin->id,
        'event_type' => StatusEvent::EVENT_CREATED_BY_ADMIN,
        'ip_address' => '10.0.0.1',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/activity');

    $response->assertOk();
    $event = $response->json('data.0');

    // Agent embed
    expect($event['agent'])->not->toBeNull();
    expect($event['agent'])->toHaveKeys(['id', 'display_number', 'telegram_username', 'status', 'deleted_at']);
    expect($event['agent']['display_number'])->toBe(1);

    // Admin embed
    expect($event['admin'])->not->toBeNull();
    expect($event['admin'])->toHaveKeys(['id', 'name', 'email']);
    expect($event['admin']['name'])->toBe('Kidus');
});

test('includes soft-deleted agent in response with deleted_at', function () {
    $agent = Agent::where('display_number', 1)->first();

    $agent->statusEvents()->create([
        'admin_id' => $this->admin->id,
        'event_type' => StatusEvent::EVENT_DELETED_BY_ADMIN,
        'ip_address' => '10.0.0.1',
        'created_at' => now(),
    ]);

    // Soft-delete the agent
    $agent->delete();

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/activity');

    $response->assertOk();
    $event = $response->json('data.0');

    expect($event['agent'])->not->toBeNull();
    expect($event['agent']['display_number'])->toBe(1);
    expect($event['agent']['deleted_at'])->not->toBeNull();
});
