<?php

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

beforeEach(function () {
    Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'correct-password',
        'name' => 'Kidus',
    ]);

    // Clear rate limiter state between tests (defense in depth even though CACHE_STORE=array)
    RateLimiter::clear('admin-login|127.0.0.1');
});

it('allows up to 5 failed login attempts per IP within 15 minutes', function () {
    for ($i = 0; $i < 5; $i++) {
        $response = $this->postJson('/api/admin/login', [
            'email' => 'kidus@kemerbet.com',
            'password' => 'wrong-password',
        ]);
        expect($response->status())->not->toBe(429);
    }
});

it('blocks 6th login attempt with 429 from same IP', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/admin/login', [
            'email' => 'kidus@kemerbet.com',
            'password' => 'wrong-password',
        ]);
    }

    $response = $this->postJson('/api/admin/login', [
        'email' => 'kidus@kemerbet.com',
        'password' => 'wrong-password',
    ]);

    expect($response->status())->toBe(429);
    expect($response->headers->get('Retry-After'))->not->toBeNull();
});

it('blocks even valid credentials after 5 failed attempts', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/admin/login', [
            'email' => 'kidus@kemerbet.com',
            'password' => 'wrong-password',
        ]);
    }

    $response = $this->postJson('/api/admin/login', [
        'email' => 'kidus@kemerbet.com',
        'password' => 'correct-password',
    ]);

    expect($response->status())->toBe(429);
});
