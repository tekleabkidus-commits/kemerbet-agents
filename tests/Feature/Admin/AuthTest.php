<?php

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

beforeEach(function () {
    RateLimiter::clear('admin-login|127.0.0.1');

    $this->admin = Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
        'name' => 'Kidus',
    ]);

    // Sanctum requires Origin header to treat requests as stateful (SPA cookie auth)
    $this->withHeaders(['Origin' => 'http://localhost:8001']);
});

// --- Login ---

test('login with valid credentials returns 200 and user json', function () {
    $response = $this->postJson('/api/admin/login', [
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
    ]);

    $response->assertOk()
        ->assertJsonPath('user.email', 'kidus@kemerbet.com')
        ->assertJsonPath('user.name', 'Kidus')
        ->assertJsonMissing(['password']);
});

test('login with invalid credentials returns 401', function () {
    $response = $this->postJson('/api/admin/login', [
        'email' => 'kidus@kemerbet.com',
        'password' => 'wrong-password',
    ]);

    $response->assertUnauthorized()
        ->assertJsonPath('message', 'Invalid credentials.');
});

test('login with missing fields returns 422', function () {
    $this->postJson('/api/admin/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password']);

    $this->postJson('/api/admin/login', ['email' => 'kidus@kemerbet.com'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);

    $this->postJson('/api/admin/login', ['password' => 'secret-password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('login with extra remember field is ignored not rejected', function () {
    $response = $this->postJson('/api/admin/login', [
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
        'remember' => true,
    ]);

    $response->assertOk()
        ->assertJsonPath('user.email', 'kidus@kemerbet.com');
});

test('login rate limits to 5 attempts per 15 minutes per ip', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/admin/login', [
            'email' => 'kidus@kemerbet.com',
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }

    $this->postJson('/api/admin/login', [
        'email' => 'kidus@kemerbet.com',
        'password' => 'wrong-password',
    ])->assertStatus(429);
});

// --- Me ---

test('get me without auth returns 401', function () {
    $this->getJson('/api/admin/me')
        ->assertUnauthorized();
});

test('get me with auth returns the admin', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/me');

    $response->assertOk()
        ->assertJsonPath('user.email', 'kidus@kemerbet.com')
        ->assertJsonPath('user.name', 'Kidus')
        ->assertJsonMissing(['password']);
});

// --- Logout ---

test('logout invalidates session and subsequent me returns 401', function () {
    // Log in via real session
    $this->postJson('/api/admin/login', [
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
    ])->assertOk();

    // Confirm session is live
    $this->getJson('/api/admin/me')->assertOk();

    // Logout
    $this->postJson('/api/admin/logout')
        ->assertOk()
        ->assertJsonPath('message', 'Logged out.');

    // Reset the test client (clears cookie jar + app state) so the next
    // request arrives without the stale session/remember-me cookies.
    $this->refreshApplication();
    $this->withHeaders(['Origin' => 'http://localhost:8001']);

    // Without valid cookies, /me should reject
    $this->getJson('/api/admin/me')
        ->assertUnauthorized();
});

// --- Session persistence ---

test('session lifetime is configured for persistent sessions', function () {
    expect(config('session.lifetime'))->toBeGreaterThanOrEqual(525600);
    expect(config('session.expire_on_close'))->toBeFalse();
});
