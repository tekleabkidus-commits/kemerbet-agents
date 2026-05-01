<?php

use App\Models\Admin;
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

// 1. List active methods (existing behavior still works)
test('admin can list active payment methods', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/payment-methods');

    $response->assertOk();
    $data = $response->json('data');
    expect($data)->toHaveCount(8);
    expect($data[0])->toHaveKey('agents_count');
});

// 2. List all methods including inactive
test('admin can list all methods including inactive', function () {
    // Deactivate one method
    PaymentMethod::where('slug', 'wegagen')->update(['is_active' => false]);

    // Default: only active (7)
    $active = $this->actingAs($this->admin)
        ->getJson('/api/admin/payment-methods');
    expect($active->json('data'))->toHaveCount(7);

    // With include_inactive: all 8
    $all = $this->actingAs($this->admin)
        ->getJson('/api/admin/payment-methods?include_inactive=true');
    expect($all->json('data'))->toHaveCount(8);
});

// 3. Create a custom payment method
test('admin can create a custom payment method', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/payment-methods', [
            'display_name' => 'Abay Bank',
            'slug' => 'abay_bank',
            'icon_url' => 'https://example.com/abay.png',
        ]);

    $response->assertStatus(201);
    expect($response->json('data.slug'))->toBe('abay_bank');
    expect($response->json('data.display_name'))->toBe('Abay Bank');
    expect($response->json('data.is_active'))->toBeTrue();

    $this->assertDatabaseHas('payment_methods', ['slug' => 'abay_bank']);
});

// 4. Create validation rejects duplicate slug
test('create validation rejects duplicate slug', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/payment-methods', [
            'display_name' => 'Another TeleBirr',
            'slug' => 'telebirr',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['slug']);
});

// 5. Create validation rejects invalid slug format
test('create validation rejects invalid slug format', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/payment-methods', [
            'display_name' => 'Bad Slug Method',
            'slug' => 'Slug With Spaces',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['slug']);
});

// 6. Update payment method
test('admin can update payment method', function () {
    $method = PaymentMethod::where('slug', 'wegagen')->first();

    $response = $this->actingAs($this->admin)
        ->putJson("/api/admin/payment-methods/{$method->id}", [
            'display_name' => 'Wegagen Bank Updated',
        ]);

    $response->assertOk();
    expect($response->json('data.display_name'))->toBe('Wegagen Bank Updated');

    $this->assertDatabaseHas('payment_methods', [
        'id' => $method->id,
        'display_name' => 'Wegagen Bank Updated',
    ]);
});

// 7. Soft delete unused payment method
test('admin can soft delete unused payment method', function () {
    // Create a method with no agents
    $method = PaymentMethod::create([
        'slug' => 'test_delete',
        'display_name' => 'Test Delete',
        'display_order' => 999,
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->admin)
        ->deleteJson("/api/admin/payment-methods/{$method->id}");

    $response->assertStatus(204);
    $this->assertSoftDeleted('payment_methods', ['id' => $method->id]);
});

// 8. Destroy returns 422 when method has linked agents
test('destroy returns 422 when method has linked agents', function () {
    $this->seed(AgentSeeder::class);

    $telebirr = PaymentMethod::where('slug', 'telebirr')->first();

    // Verify it has agents linked
    expect($telebirr->agents()->count())->toBeGreaterThan(0);

    $response = $this->actingAs($this->admin)
        ->deleteJson("/api/admin/payment-methods/{$telebirr->id}");

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('Cannot delete payment method');
    expect($response->json('message'))->toContain('agent(s)');

    // Not deleted
    $this->assertDatabaseHas('payment_methods', ['id' => $telebirr->id, 'deleted_at' => null]);
});

// 9. Admin can reorder payment methods
test('admin can reorder payment methods', function () {
    $methods = PaymentMethod::orderBy('display_order')->get();
    $originalFirst = $methods->first();
    $originalLast = $methods->last();

    // Reverse the order
    $reversedIds = $methods->pluck('id')->reverse()->values()->all();

    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/payment-methods/reorder', [
            'ids' => $reversedIds,
        ]);

    $response->assertOk();

    // What was last is now first (display_order = 0)
    expect(PaymentMethod::find($originalLast->id)->display_order)->toBe(0);
    // What was first is now last (display_order = 70)
    expect(PaymentMethod::find($originalFirst->id)->display_order)->toBe(70);
});

// 10. Unauthenticated user cannot access endpoints
test('unauthenticated user cannot access crud endpoints', function () {
    $method = PaymentMethod::first();

    $this->postJson('/api/admin/payment-methods', [
        'display_name' => 'Test',
        'slug' => 'test',
    ])->assertUnauthorized();

    $this->putJson("/api/admin/payment-methods/{$method->id}", [
        'display_name' => 'Updated',
    ])->assertUnauthorized();

    $this->deleteJson("/api/admin/payment-methods/{$method->id}")
        ->assertUnauthorized();

    $this->postJson('/api/admin/payment-methods/reorder', [
        'ids' => [$method->id],
    ])->assertUnauthorized();
});
