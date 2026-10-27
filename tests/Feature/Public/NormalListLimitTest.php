<?php

use App\Models\Agent;
use App\Models\Setting;
use App\Services\AgentRankSampler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function () {
    Cache::flush();
    Setting::updateOrCreate(['key' => 'pair_mode_enabled'], ['value' => false, 'updated_at' => now()]);
    Setting::updateOrCreate(['key' => 'normal_list_limit_enabled'], ['value' => true, 'updated_at' => now()]);
    Setting::updateOrCreate(['key' => 'normal_list_limit'], ['value' => 10, 'updated_at' => now()]);
});

function limitAgents(int $n): void
{
    for ($i = 1; $i <= $n; $i++) {
        Agent::create([
            'display_number' => $i,
            'telegram_username' => 'limited_agent_'.$i,
            'status' => Agent::STATUS_ACTIVE,
            'live_until' => now()->addHours(3),
        ]);
    }
}

test('normal list limits the public API to ten unique online agents', function () {
    limitAgents(100);
    $res = $this->getJson('/api/public/agents?viewer_id=viewer-aaaaaaaaaaaaaaaa')->assertOk();
    expect($res->json('agents'))->toHaveCount(10);
    expect($res->json('live_count'))->toBe(10);
    expect(collect($res->json('agents'))->pluck('id')->unique())->toHaveCount(10);
    expect($res->json('directory'))->toHaveCount(10);
    foreach ($res->json('agents') as $agent) {
        expect($agent)->not->toHaveKey('effective_rank');
        expect($agent)->not->toHaveKey('rank_override_level');
    }
    expect($res->json())->not->toHaveKey('normal_limit_pool');
});

test('same viewer gets stable shortlist and different viewers get different candidates', function () {
    limitAgents(100);
    $url = '/api/public/agents?viewer_id=viewer-bbbbbbbbbbbbbbbb';
    $a = collect($this->getJson($url)->json('agents'))->pluck('id')->all();
    $b = collect($this->getJson($url)->json('agents'))->pluck('id')->all();
    expect($b)->toBe($a);

    $other = collect($this->getJson('/api/public/agents?viewer_id=viewer-cccccccccccccccc')->json('agents'))->pluck('id')->all();
    expect($other)->not->toBe($a);
});

test('normal limit disabled preserves full classic list', function () {
    limitAgents(24);
    Setting::where('key', 'normal_list_limit_enabled')->update(['value' => json_encode(false)]);
    Cache::flush();
    $res = $this->getJson('/api/public/agents')->assertOk();
    expect($res->json('agents'))->toHaveCount(24);
});

test('pair mode takes precedence over normal list cap', function () {
    limitAgents(30);
    Setting::updateOrCreate(['key' => 'pair_mode_enabled'], ['value' => true, 'updated_at' => now()]);
    Setting::updateOrCreate(['key' => 'pair_size'], ['value' => 2, 'updated_at' => now()]);
    Cache::flush();

    $res = $this->postJson('/api/public/pair', [
        'device_id' => 'device-aaaaaaaaaaaaaaaa',
        'player_id' => 'TEST123',
        'intent' => 'deposit',
    ])->assertOk();

    expect($res->json('agents'))->toHaveCount(2);
    expect($this->getJson('/api/public/agents')->json('settings.normal_list_limit_enabled'))->toBeFalse();
});

test('offline and disabled agents do not consume limited slots', function () {
    limitAgents(12);
    Agent::where('display_number', 1)->update(['live_until' => now()->subMinute()]);
    Agent::where('display_number', 2)->update(['status' => Agent::STATUS_DISABLED]);
    Cache::flush();
    $res = $this->getJson('/api/public/agents?viewer_id=viewer-dddddddddddddddd');
    expect($res->json('agents'))->toHaveCount(10);
    expect(collect($res->json('agents'))->pluck('id'))->not->toContain(
        Agent::where('display_number', 1)->value('id'),
        Agent::where('display_number', 2)->value('id')
    );
});

test('rank weights favor higher levels over many distinct viewers', function () {
    $low = Agent::create([
        'display_number' => 201, 'telegram_username' => 'rank_low',
        'status' => Agent::STATUS_ACTIVE, 'live_until' => now()->addHour(),
        'rank_override_level' => 1, 'rank_override_expires_at' => now()->addHour(),
    ]);
    $high = Agent::create([
        'display_number' => 202, 'telegram_username' => 'rank_high',
        'status' => Agent::STATUS_ACTIVE, 'live_until' => now()->addHour(),
        'rank_override_level' => 10, 'rank_override_expires_at' => now()->addHour(),
    ]);
    $sampler = app(AgentRankSampler::class);
    $highCount = 0;
    foreach (range(1, 300) as $i) {
        if ($sampler->sample(collect([$low, $high]), 1, 'viewer-'.str_pad((string) $i, 5, '0'))->first()->id === $high->id) {
            $highCount++;
        }
    }
    expect($highCount)->toBeGreaterThan(160);
});

test('limited mode reserves at most two pinned slots when enough unpinned agents exist', function () {
    limitAgents(25);
    Agent::whereIn('display_number', [1, 2, 3, 4, 5])->update(['pinned_at' => now()->subHour()]);
    Cache::flush();
    $response = $this->getJson('/api/public/agents?viewer_id=viewer-eeeeeeeeeeeeeeee');
    expect($response->json('agents'))->toHaveCount(10);
    expect(collect($response->json('agents'))->filter(fn (array $a) => $a['is_pinned'])->count())->toBe(2);
});

test('rank has an effect on uncapped normal listings when shuffle is off', function () {
    limitAgents(4);
    Setting::where('key', 'normal_list_limit_enabled')->update(['value' => json_encode(false)]);
    Setting::updateOrCreate(['key' => 'shuffle_live_agents'], ['value' => false, 'updated_at' => now()]);
    Agent::where('display_number', 4)->update([
        'rank_override_level' => 10, 'rank_override_expires_at' => now()->addHours(2),
    ]);
    Cache::flush();
    $res = $this->getJson('/api/public/agents?viewer_id=viewer-ffffffffffffffff')->assertOk();
    expect($res->json('agents'))->toHaveCount(4);
    expect($res->json('agents.0.display_number'))->toBe(4);
    expect($res->json('settings.server_ranked_agents'))->toBeTrue();
});
