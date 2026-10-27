<?php

use App\Models\Admin;
use App\Models\Agent;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::create([
        'email' => 'ranking-admin@example.com',
        'name' => 'Ranking Admin',
        'password' => 'test-password',
    ]);
    $this->agent = Agent::create([
        'display_number' => 500,
        'telegram_username' => 'rankagent',
        'status' => Agent::STATUS_ACTIVE,
        'live_until' => now()->addHour(),
    ]);
    $this->withHeaders(['Origin' => 'http://localhost:8001']);
});

test('new agents default to level five', function () {
    expect($this->agent->effectiveRank())->toBe(5);
    $this->actingAs($this->admin)->getJson('/api/admin/agents/'.$this->agent->id)
        ->assertOk()->assertJsonPath('data.effective_rank', 5)
        ->assertJsonPath('data.rank_override_expires_at', null);
});

test('unauthenticated requests cannot modify ranking', function () {
    $this->postJson('/api/admin/agents/'.$this->agent->id.'/rank-override', [
        'level' => 8, 'expires_at' => now()->addDay()->toIso8601String(), 'reason' => 'Great availability',
    ])->assertUnauthorized();
});

test('authorized admin can raise rank temporarily and it expires back to five', function () {
    $until = now()->addHours(24);
    $this->actingAs($this->admin)->postJson('/api/admin/agents/'.$this->agent->id.'/rank-override', [
        'level' => 8, 'expires_at' => $until->toIso8601String(), 'reason' => 'Dependable availability',
    ])->assertOk()->assertJsonPath('data.effective_rank', 8);
    expect($this->agent->fresh()->effectiveRank())->toBe(8);
    expect(DB::table('agent_rank_audits')->where('agent_id', $this->agent->id)->count())->toBe(1);

    \Illuminate\Support\Carbon::setTestNow(now()->addHours(25));
    try {
        expect($this->agent->fresh()->effectiveRank())->toBe(5);
        $this->actingAs($this->admin)->getJson('/api/admin/agents/'.$this->agent->id)
            ->assertJsonPath('data.effective_rank', 5)
            ->assertJsonPath('data.rank_override_level', null);
    } finally {
        \Illuminate\Support\Carbon::setTestNow();
    }
});

test('manual reset immediately returns rank to five with audit', function () {
    $url = '/api/admin/agents/'.$this->agent->id.'/rank-override';
    $this->actingAs($this->admin)->postJson($url, [
        'level' => 3, 'expires_at' => now()->addHours(6)->toIso8601String(), 'reason' => 'Temporary restriction',
    ])->assertOk();
    $this->actingAs($this->admin)->deleteJson($url)->assertOk()->assertJsonPath('data.effective_rank', 5);
    expect(DB::table('agent_rank_audits')->where('agent_id', $this->agent->id)->count())->toBe(2);
});

test('invalid level, expired time or missing reason cannot change rank', function () {
    $url = '/api/admin/agents/'.$this->agent->id.'/rank-override';
    $this->actingAs($this->admin)->postJson($url, [
        'level' => 11, 'expires_at' => now()->addDay()->toIso8601String(), 'reason' => 'Testing',
    ])->assertUnprocessable()->assertJsonValidationErrors('level');
    $this->actingAs($this->admin)->postJson($url, [
        'level' => 7, 'expires_at' => now()->subMinute()->toIso8601String(), 'reason' => 'Testing',
    ])->assertUnprocessable()->assertJsonValidationErrors('expires_at');
    $this->actingAs($this->admin)->postJson($url, [
        'level' => 7, 'expires_at' => now()->addDay()->toIso8601String(),
    ])->assertUnprocessable()->assertJsonValidationErrors('reason');
    expect($this->agent->fresh()->effectiveRank())->toBe(5);
});

test('normal list cap setting validates range and ships disabled by default', function () {
    $this->seed(\Database\Seeders\SettingSeeder::class);
    $settings = $this->actingAs($this->admin)->getJson('/api/admin/settings')->json('data.settings');
    expect($settings['normal_list_limit_enabled'])->toBeFalse();
    expect($settings['normal_list_limit'])->toBe(10);

    $this->actingAs($this->admin)->patchJson('/api/admin/settings', [
        'normal_list_limit_enabled' => true, 'normal_list_limit' => 12,
    ])->assertOk()->assertJsonPath('data.settings.normal_list_limit', 12);
    expect(Setting::find('normal_list_limit_enabled')->value)->toBeTrue();

    $this->actingAs($this->admin)->patchJson('/api/admin/settings', ['normal_list_limit' => 31])
        ->assertUnprocessable()->assertJsonValidationErrors('normal_list_limit');
});
