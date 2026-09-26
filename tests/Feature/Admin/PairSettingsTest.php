<?php

use App\Models\Admin;
use App\Models\Agent;
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

test('pair rule ships off with a size of 2', function () {
    $settings = $this->actingAs($this->admin)->getJson('/api/admin/settings')->json('data.settings');

    expect($settings['pair_mode_enabled'])->toBeFalse();
    expect($settings['pair_size'])->toBe(2);
});

test('admin can turn the pair rule on and change the size', function () {
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', ['pair_mode_enabled' => true, 'pair_size' => 3])
        ->assertOk()
        ->assertJsonPath('data.settings.pair_mode_enabled', true)
        ->assertJsonPath('data.settings.pair_size', 3);

    expect(Setting::find('pair_mode_enabled')->value)->toBeTrue();
});

test('pair size must be between 1 and 5', function (mixed $size) {
    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', ['pair_size' => $size])
        ->assertStatus(422)
        ->assertJsonValidationErrors('pair_size');
})->with([0, 6, 'two']);

test('turning the pair rule on takes effect on the public widget immediately', function () {
    Agent::create([
        'display_number' => 1,
        'telegram_username' => 'agent_one',
        'status' => Agent::STATUS_ACTIVE,
        'live_until' => now()->addHour(),
    ]);

    // Warm the public cache with the classic list.
    expect($this->getJson('/api/public/agents')->json('agents'))->toHaveCount(1);

    $this->actingAs($this->admin)
        ->patchJson('/api/admin/settings', ['pair_mode_enabled' => true])
        ->assertOk();

    $res = $this->getJson('/api/public/agents');
    expect($res->json('agents'))->toBe([]);
    expect($res->json('settings.pair_mode_enabled'))->toBeTrue();
});

test('re-running the setting seeder never overwrites an admin choice', function () {
    Setting::where('key', 'pair_mode_enabled')->update(['value' => json_encode(true)]);

    $this->seed(SettingSeeder::class);

    expect(Setting::find('pair_mode_enabled')->value)->toBeTrue();
});
