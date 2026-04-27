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

// --- Auth ---

test('unauthenticated request returns 401', function () {
    $this->getJson('/api/admin/agents')
        ->assertUnauthorized();
});

// --- Default listing ---

test('authenticated default request returns paginated 24 agents on page 1', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents');

    $response->assertOk()
        ->assertJsonCount(20, 'data')
        ->assertJsonPath('meta.total', 24)
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.per_page', 20);
});

test('default request returns rows ordered by display_number asc', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents');

    $data = $response->json('data');
    $numbers = array_column($data, 'display_number');

    expect($numbers)->toBe(range(1, 20));
});

// --- Pagination ---

test('per_page=10 returns 10 agents and last_page=3', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?per_page=10');

    $response->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('meta.last_page', 3)
        ->assertJsonPath('meta.total', 24);
});

// --- Search ---

test('search by partial display_number filters correctly', function () {
    // Search for "24" — should match agent with display_number=24 only
    // (no seeded telegram usernames contain "24")
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?search=24');

    $data = $response->json('data');

    expect(count($data))->toBe(1);
    expect($data[0]['display_number'])->toBe(24);
});

test('search by partial display_number matches multiple results', function () {
    // Search for "1" — should match agents 1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?search=1');

    $numbers = array_column($response->json('data'), 'display_number');

    // Proves partial matching: "1" matches both 1 (exact) and 10 (partial)
    expect($numbers)->toContain(1);
    expect($numbers)->toContain(10);
});

test('search by partial telegram_username filters correctly case-insensitive', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?search=doitfast');

    $response->assertOk();

    $data = $response->json('data');
    expect(count($data))->toBe(1);
    expect(strtolower($data[0]['telegram_username']))->toContain('doitfast');
});

// --- Status filters ---

test('status=live returns only agents with live_until in future and status=active', function () {
    $liveAgent = Agent::where('display_number', 1)->first();
    $liveAgent->update([
        'live_until' => now()->addHour(),
        'status' => 'active',
    ]);

    // Negative case: disabled agent with future live_until — must NOT appear in live filter
    Agent::where('display_number', 2)->update([
        'live_until' => now()->addHour(),
        'status' => 'disabled',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?status=live');

    $data = $response->json('data');
    expect(count($data))->toBe(1);
    expect($data[0]['display_number'])->toBe(1);
    expect($data[0]['computed_status'])->toBe('live');
});

test('status=offline returns active agents whose live_until is null or past', function () {
    // Make one agent live to exclude them
    Agent::where('display_number', 1)->update([
        'live_until' => now()->addHour(),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?status=offline');

    $data = $response->json('data');
    $total = $response->json('meta.total');

    // 24 total - 1 live = 23 offline (all seeded as active with null live_until)
    expect($total)->toBe(23);

    foreach ($data as $agent) {
        expect($agent['computed_status'])->toBe('offline');
        expect($agent['status'])->toBe('active');
    }
});

test('status=disabled returns only status=disabled agents', function () {
    Agent::where('display_number', 1)->update(['status' => 'disabled']);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?status=disabled');

    $data = $response->json('data');
    expect(count($data))->toBe(1);
    expect($data[0]['display_number'])->toBe(1);
    expect($data[0]['computed_status'])->toBe('disabled');
});

test('status=deleted returns only soft-deleted agents', function () {
    Agent::where('display_number', 1)->first()->delete();

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?status=deleted');

    $data = $response->json('data');
    expect(count($data))->toBe(1);
    expect($data[0]['display_number'])->toBe(1);

    // Verify the deleted agent is excluded from default listing
    $defaultResponse = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents');

    expect($defaultResponse->json('meta.total'))->toBe(23);
});

// --- Payment method filter ---

test('payment_method=telebirr filters to agents with that method', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?payment_method=telebirr');

    // All 24 seeded agents have TeleBirr
    expect($response->json('meta.total'))->toBe(24);
});

test('payment_method=mpesa returns 0 agents', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?payment_method=mpesa');

    expect($response->json('meta.total'))->toBe(0);
    expect($response->json('data'))->toBeEmpty();
});

// --- Validation ---

test('invalid sort param returns 422', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?sort=invalid')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['sort']);
});

test('invalid status param returns 422', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?status=bogus')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);
});

// --- Response shape ---

test('response includes payment_methods loaded for each agent', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?per_page=1');

    $agent = $response->json('data.0');

    expect($agent)->toHaveKeys([
        'id', 'display_number', 'telegram_username', 'status',
        'computed_status', 'live_until', 'seconds_remaining',
        'last_status_change_at', 'payment_methods', 'notes',
        'clicks_today', 'clicks_total', 'created_at',
    ]);

    expect($agent['payment_methods'])->toBeArray();
    expect($agent['payment_methods'][0])->toHaveKeys(['id', 'slug', 'display_name']);
});

// --- Sort ---

test('sort by last_seen with mixed null/non-null last_status_change_at puts nulls last', function () {
    // Give agents 1 and 2 explicit last_status_change_at values
    Agent::where('display_number', 1)->update([
        'last_status_change_at' => now()->subHours(2),
    ]);
    Agent::where('display_number', 2)->update([
        'last_status_change_at' => now()->subHour(),
    ]);
    // All other agents have null last_status_change_at (seeded default)

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/agents?sort=last_seen&per_page=50');

    $data = $response->json('data');

    // First two should be the ones with non-null values (most recent first)
    expect($data[0]['display_number'])->toBe(2);
    expect($data[1]['display_number'])->toBe(1);

    // All remaining should have null last_status_change_at
    for ($i = 2; $i < count($data); $i++) {
        expect($data[$i]['last_status_change_at'])->toBeNull();
    }
});
