<?php

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'old-password-123',
        'name' => 'Kidus',
    ]);

    $this->withHeaders(['Origin' => 'http://localhost:8001']);
});

it('changes password with valid current and new password', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/auth/change-password', [
            'current_password' => 'old-password-123',
            'new_password' => 'new-password-456',
            'new_password_confirmation' => 'new-password-456',
        ])
        ->assertOk()
        ->assertJson(['message' => 'Password updated successfully.']);

    $this->admin->refresh();
    expect(Hash::check('new-password-456', $this->admin->password))->toBeTrue();
});

it('rejects wrong current password with 422', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/auth/change-password', [
            'current_password' => 'wrong-password',
            'new_password' => 'new-password-456',
            'new_password_confirmation' => 'new-password-456',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['current_password']);
});

it('rejects new password shorter than 8 characters', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/auth/change-password', [
            'current_password' => 'old-password-123',
            'new_password' => 'short',
            'new_password_confirmation' => 'short',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['new_password']);
});

it('rejects mismatched confirmation', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/auth/change-password', [
            'current_password' => 'old-password-123',
            'new_password' => 'new-password-456',
            'new_password_confirmation' => 'different-password',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['new_password']);
});

it('rejects new password that matches current password', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/auth/change-password', [
            'current_password' => 'old-password-123',
            'new_password' => 'old-password-123',
            'new_password_confirmation' => 'old-password-123',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['new_password']);
});

it('returns 401 when unauthenticated', function () {
    $this->postJson('/api/admin/auth/change-password', [
        'current_password' => 'old-password-123',
        'new_password' => 'new-password-456',
        'new_password_confirmation' => 'new-password-456',
    ])->assertUnauthorized();
});
