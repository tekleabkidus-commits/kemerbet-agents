<?php

use App\Models\Admin;
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

test('unauthenticated returns 401', function () {
    $this->getJson('/api/admin/payment-methods')
        ->assertUnauthorized();
});

test('authenticated returns 8 active payment methods', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/payment-methods');

    $response->assertOk();

    $data = $response->json('data');
    expect($data)->toHaveCount(8);

    // First method should be TeleBirr (display_order 10)
    expect($data[0]['slug'])->toBe('telebirr');
    expect($data[0]['display_name'])->toBe('TeleBirr');

    // Each method has the expected keys
    expect($data[0])->toHaveKeys(['id', 'slug', 'display_name']);

    // Last method should be Wegagen (display_order 80)
    expect($data[7]['slug'])->toBe('wegagen');
});
