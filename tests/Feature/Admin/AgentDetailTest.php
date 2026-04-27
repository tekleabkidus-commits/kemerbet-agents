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
    $this->seed(AgentSeeder::class);
});

// =============================================================
// Show
// =============================================================

test('show unauthenticated returns 401', function () {
    $agent = Agent::where('display_number', 1)->first();

    $this->getJson("/api/admin/agents/{$agent->id}")
        ->assertUnauthorized();
});

test('show nonexistent agent returns 404', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/agents/99999')
        ->assertNotFound();
});

test('show soft-deleted agent returns 404', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->delete();

    $this->actingAs($this->admin)
        ->getJson("/api/admin/agents/{$agent->id}")
        ->assertNotFound();
});

test('show valid agent returns full detail with active_token_url', function () {
    $agent = Agent::where('display_number', 1)->first();

    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/agents/{$agent->id}");

    $response->assertOk();

    $data = $response->json('data');

    expect($data)->toHaveKeys([
        'id', 'display_number', 'telegram_username', 'status',
        'computed_status', 'live_until', 'seconds_remaining',
        'last_status_change_at', 'payment_methods', 'notes',
        'active_token_url', 'active_token_created_at',
        'active_token_last_used_at', 'clicks_today', 'clicks_total',
        'created_at',
    ]);

    expect($data['display_number'])->toBe(1);
    expect($data['active_token_url'])->toStartWith(config('app.url').'/a/');
    expect($data['payment_methods'])->toBeArray();
    expect($data['payment_methods'])->not->toBeEmpty();
});

test('show agent with no active token returns active_token_url as null', function () {
    $agent = Agent::where('display_number', 1)->first();

    // Revoke all tokens
    $agent->tokens()->update(['revoked_at' => now()]);

    $response = $this->actingAs($this->admin)
        ->getJson("/api/admin/agents/{$agent->id}");

    $response->assertOk();
    expect($response->json('data.active_token_url'))->toBeNull();
    expect($response->json('data.active_token_created_at'))->toBeNull();
    expect($response->json('data.active_token_last_used_at'))->toBeNull();
});

// =============================================================
// Update
// =============================================================

test('update unauthenticated returns 401', function () {
    $agent = Agent::where('display_number', 1)->first();

    $this->putJson("/api/admin/agents/{$agent->id}", [
        'telegram_username' => 'new_handle',
    ])->assertUnauthorized();
});

test('update with valid telegram_username updates and returns agent', function () {
    $agent = Agent::where('display_number', 1)->first();

    $response = $this->actingAs($this->admin)
        ->putJson("/api/admin/agents/{$agent->id}", [
            'telegram_username' => 'new_handle_123',
        ]);

    $response->assertOk();
    expect($response->json('data.telegram_username'))->toBe('new_handle_123');
    expect(Agent::find($agent->id)->telegram_username)->toBe('new_handle_123');
});

test('update with invalid telegram_username format returns 422', function () {
    $agent = Agent::where('display_number', 1)->first();

    // Contains @
    $this->actingAs($this->admin)
        ->putJson("/api/admin/agents/{$agent->id}", [
            'telegram_username' => '@bad_handle',
        ])->assertUnprocessable()
        ->assertJsonValidationErrors(['telegram_username']);

    // Too short
    $this->actingAs($this->admin)
        ->putJson("/api/admin/agents/{$agent->id}", [
            'telegram_username' => 'ab',
        ])->assertUnprocessable()
        ->assertJsonValidationErrors(['telegram_username']);

    // Contains spaces
    $this->actingAs($this->admin)
        ->putJson("/api/admin/agents/{$agent->id}", [
            'telegram_username' => 'has space',
        ])->assertUnprocessable()
        ->assertJsonValidationErrors(['telegram_username']);
});

test('update payment_method_ids syncs correctly', function () {
    $agent = Agent::where('display_number', 1)->first();
    $telebirr = PaymentMethod::where('slug', 'telebirr')->first();
    $mpesa = PaymentMethod::where('slug', 'mpesa')->first();
    $cbe = PaymentMethod::where('slug', 'cbe_birr')->first();

    // Agent starts with TeleBirr only (from seeder). Sync to M-Pesa + CBE.
    $response = $this->actingAs($this->admin)
        ->putJson("/api/admin/agents/{$agent->id}", [
            'payment_method_ids' => [$mpesa->id, $cbe->id],
        ]);

    $response->assertOk();

    $slugs = collect($response->json('data.payment_methods'))->pluck('slug')->sort()->values()->all();
    expect($slugs)->toBe(['cbe_birr', 'mpesa']);

    // Confirm TeleBirr is removed
    $dbSlugs = $agent->fresh()->paymentMethods->pluck('slug')->sort()->values()->all();
    expect($dbSlugs)->toBe(['cbe_birr', 'mpesa']);
});

test('update with payment_method_ids=[] returns 422', function () {
    $agent = Agent::where('display_number', 1)->first();

    $this->actingAs($this->admin)
        ->putJson("/api/admin/agents/{$agent->id}", [
            'payment_method_ids' => [],
        ])->assertUnprocessable()
        ->assertJsonValidationErrors(['payment_method_ids']);
});

test('update notes to null clears notes', function () {
    $agent = Agent::where('display_number', 1)->first();
    $agent->update(['notes' => 'Old notes here']);

    $response = $this->actingAs($this->admin)
        ->putJson("/api/admin/agents/{$agent->id}", [
            'notes' => null,
        ]);

    $response->assertOk();
    expect($response->json('data.notes'))->toBeNull();
    expect(Agent::find($agent->id)->notes)->toBeNull();
});

test('partial update with only notes leaves other fields unchanged', function () {
    $agent = Agent::where('display_number', 1)->first();
    $originalUsername = $agent->telegram_username;
    $originalMethodIds = $agent->paymentMethods->pluck('id')->sort()->values()->all();

    $response = $this->actingAs($this->admin)
        ->putJson("/api/admin/agents/{$agent->id}", [
            'notes' => 'New private note',
        ]);

    $response->assertOk();
    expect($response->json('data.notes'))->toBe('New private note');
    expect($response->json('data.telegram_username'))->toBe($originalUsername);

    $updatedMethodIds = $agent->fresh()->paymentMethods->pluck('id')->sort()->values()->all();
    expect($updatedMethodIds)->toBe($originalMethodIds);
});
