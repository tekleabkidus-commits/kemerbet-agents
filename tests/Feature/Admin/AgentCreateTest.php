<?php

use App\Models\Admin;
use App\Models\Agent;
use App\Models\PaymentMethod;
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
});

function validPayload(): array
{
    $methodId = PaymentMethod::where('slug', 'telebirr')->first()->id;

    return [
        'telegram_username' => 'new_agent_handle',
        'payment_method_ids' => [$methodId],
    ];
}

// =============================================================
// Auth
// =============================================================

test('returns 401 when unauthenticated', function () {
    $this->postJson('/api/admin/agents', validPayload())
        ->assertUnauthorized();
});

// =============================================================
// Successful creation
// =============================================================

test('creates an agent with valid data and returns 201', function () {
    $telebirr = PaymentMethod::where('slug', 'telebirr')->first();
    $mpesa = PaymentMethod::where('slug', 'mpesa')->first();

    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', [
            'telegram_username' => 'brand_new_agent',
            'payment_method_ids' => [$telebirr->id, $mpesa->id],
            'notes' => 'Test notes',
        ]);

    $response->assertCreated();

    $data = $response->json('data');

    expect($data)->toHaveKeys([
        'id', 'display_number', 'telegram_username', 'status',
        'computed_status', 'payment_methods', 'active_token_url',
        'active_token_created_at', 'created_at',
    ]);

    expect($data['telegram_username'])->toBe('brand_new_agent');
    expect($data['status'])->toBe('active');
    expect($data['computed_status'])->toBe('offline');
    expect($data['notes'])->toBe('Test notes');
    expect($data['active_token_url'])->toStartWith(config('app.url').'/a/');
    expect($data['payment_methods'])->toHaveCount(2);

    $slugs = collect($data['payment_methods'])->pluck('slug')->sort()->values()->all();
    expect($slugs)->toBe(['mpesa', 'telebirr']);
});

test('auto-assigns display_number as max plus one', function () {
    $this->seed(AgentSeeder::class);

    // Seeder creates 24 agents with display_number 1-24
    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', validPayload());

    $response->assertCreated();
    expect($response->json('data.display_number'))->toBe(25);
});

test('auto-assigns display_number counting soft-deleted agents', function () {
    $this->seed(AgentSeeder::class);

    // Create agent #25, then soft-delete it
    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', validPayload());
    $agentId = $response->json('data.id');
    Agent::find($agentId)->delete();

    // Next agent should be #26, not #25
    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', [
            'telegram_username' => 'another_agent',
            'payment_method_ids' => [PaymentMethod::first()->id],
        ]);

    $response->assertCreated();
    expect($response->json('data.display_number'))->toBe(26);
});

test('allows duplicate telegram_username', function () {
    $payload = validPayload();

    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', $payload)
        ->assertCreated();

    // Same username again — should succeed
    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', $payload)
        ->assertCreated();
});

// =============================================================
// Validation errors
// =============================================================

test('returns 422 when telegram_username is missing', function () {
    $payload = validPayload();
    unset($payload['telegram_username']);

    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['telegram_username']);
});

test('returns 422 when telegram_username fails regex', function () {
    $payload = validPayload();

    // Contains @
    $payload['telegram_username'] = '@bad_handle';
    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['telegram_username']);

    // Too short
    $payload['telegram_username'] = 'ab';
    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['telegram_username']);

    // Contains spaces
    $payload['telegram_username'] = 'has space';
    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['telegram_username']);
});

test('returns 422 when payment_method_ids is empty', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', [
            'telegram_username' => 'valid_handle',
            'payment_method_ids' => [],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['payment_method_ids']);
});

test('returns 422 when payment_method_ids contains invalid id', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', [
            'telegram_username' => 'valid_handle',
            'payment_method_ids' => [99999],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['payment_method_ids.0']);
});

test('returns 422 when notes exceeds max length', function () {
    $payload = validPayload();
    $payload['notes'] = str_repeat('a', 2001);

    $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['notes']);
});

// =============================================================
// Status event audit
// =============================================================

test('logs created_by_admin status_event with admin_id and ip_address', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/agents', validPayload());

    $response->assertCreated();

    $agentId = $response->json('data.id');

    $this->assertDatabaseHas('status_events', [
        'agent_id' => $agentId,
        'admin_id' => $this->admin->id,
        'event_type' => 'created_by_admin',
    ]);
});
