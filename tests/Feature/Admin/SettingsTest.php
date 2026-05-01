<?php

use App\Models\Admin;
use App\Models\Setting;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
        'name' => 'Kidus',
    ]);

    $this->withHeaders(['Origin' => 'http://localhost:8001']);

    $this->seed(SettingSeeder::class);
});

// 1. Admin can get all settings
test('admin can get all settings', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/settings');

    $response->assertOk();

    $settings = $response->json('data.settings');
    expect($settings)->toHaveKeys([
        'prefill_message',
        'agent_hide_after_hours',
        'public_refresh_interval_seconds',
        'show_offline_agents',
        'warn_on_offline_click',
        'shuffle_live_agents',
        'onboarding_video_url',
    ]);

    // Type checks
    expect($settings['prefill_message'])->toBeString();
    expect($settings['agent_hide_after_hours'])->toBeInt();
    expect($settings['show_offline_agents'])->toBeBool();
});

// 2. Unauthenticated cannot get settings
test('unauthenticated cannot get settings', function () {
    $this->getJson('/api/admin/settings')
        ->assertUnauthorized();
});

// 3. Admin can update single setting
test('admin can update single setting', function () {
    $response = $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'prefill_message' => 'Updated message',
        ]);

    $response->assertOk();

    $this->assertDatabaseHas('settings', [
        'key' => 'prefill_message',
    ]);

    $updated = Setting::where('key', 'prefill_message')->first();
    expect($updated->value)->toBe('Updated message');

    // Other settings unchanged
    $hideAfter = Setting::where('key', 'agent_hide_after_hours')->first();
    expect($hideAfter->value)->toBe(12);
});

// 4. Admin can update multiple settings
test('admin can update multiple settings', function () {
    $response = $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'prefill_message' => 'New message',
            'agent_hide_after_hours' => 24,
            'shuffle_live_agents' => false,
        ]);

    $response->assertOk();

    expect(Setting::where('key', 'prefill_message')->first()->value)->toBe('New message');
    expect(Setting::where('key', 'agent_hide_after_hours')->first()->value)->toBe(24);
    expect(Setting::where('key', 'shuffle_live_agents')->first()->value)->toBe(false);
});

// 5. Validation rejects invalid integer (over max)
test('validation rejects invalid integer', function () {
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'agent_hide_after_hours' => 200,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['agent_hide_after_hours']);
});

// 6. Validation rejects invalid string (over max length)
test('validation rejects invalid string', function () {
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'prefill_message' => str_repeat('x', 250),
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['prefill_message']);
});

// 7. Validation rejects unknown key
test('validation rejects unknown key', function () {
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'foo' => 'bar',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['foo']);
});

// 8. Unauthenticated cannot update settings
test('unauthenticated cannot update settings', function () {
    $this->patchJson('/api/admin/settings', [
        'prefill_message' => 'Hacked',
    ])->assertUnauthorized();
});

// 9. Response returns full settings after update
test('response returns full settings after update', function () {
    $response = $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'prefill_message' => 'Updated',
        ]);

    $response->assertOk();

    $settings = $response->json('data.settings');
    expect($settings)->toHaveKeys([
        'prefill_message',
        'agent_hide_after_hours',
        'public_refresh_interval_seconds',
        'show_offline_agents',
        'warn_on_offline_click',
        'shuffle_live_agents',
        'onboarding_video_url',
    ]);
    expect($settings['prefill_message'])->toBe('Updated');
});

// 10. Boolean values round-trip correctly
test('boolean values round trip correctly', function () {
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'show_offline_agents' => false,
        ])
        ->assertOk();

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/settings');

    $settings = $response->json('data.settings');
    expect($settings['show_offline_agents'])->toBeFalse();
    expect($settings['show_offline_agents'])->toBeBool();
});

// 11. Settings response includes embed_base_url
test('settings response includes embed_base_url', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/settings');

    $response->assertOk();
    $data = $response->json('data');

    expect($data)->toHaveKey('settings');
    expect($data)->toHaveKey('embed_base_url');
    expect($data['embed_base_url'])->toBeString();
    expect($data['embed_base_url'])->not->toEndWith('/');
});

// 12. Accepts valid youtube.com/watch URL for onboarding video
test('accepts valid youtube watch URL for onboarding video', function () {
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'onboarding_video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ])
        ->assertOk();

    expect(Setting::where('key', 'onboarding_video_url')->first()->value)
        ->toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

// 13. Accepts valid youtu.be short URL for onboarding video
test('accepts valid youtu.be short URL for onboarding video', function () {
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'onboarding_video_url' => 'https://youtu.be/dQw4w9WgXcQ',
        ])
        ->assertOk();

    expect(Setting::where('key', 'onboarding_video_url')->first()->value)
        ->toBe('https://youtu.be/dQw4w9WgXcQ');
});

// 14. Rejects non-YouTube URL for onboarding video
test('rejects non-youtube URL for onboarding video', function () {
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'onboarding_video_url' => 'https://vimeo.com/123456',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['onboarding_video_url']);
});

// 15. Accepts empty string for onboarding video (disables it)
test('accepts empty string for onboarding video', function () {
    // First set a video URL
    Setting::updateOrCreate(
        ['key' => 'onboarding_video_url'],
        ['value' => 'https://youtu.be/dQw4w9WgXcQ', 'updated_at' => now()]
    );

    // Then clear it
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', [
            'onboarding_video_url' => '',
        ])
        ->assertOk();

    expect(Setting::where('key', 'onboarding_video_url')->first()->value)
        ->toBe('');
});
