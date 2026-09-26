<?php

use App\Models\Agent;
use App\Models\PaymentMethod;
use App\Models\PlayerAgentAssignment;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

// Pair rule: each player sees only their own agents, remembered per device
// and per player ID. These tests walk through every rule agreed for it.

beforeEach(function () {
    Cache::flush();
    Carbon::setTestNow('2026-09-26 12:00:00');
    pairSetting('pair_mode_enabled', true);
    pairSetting('pair_size', 2);
});

afterEach(function () {
    Carbon::setTestNow();
});

function pairSetting(string $key, mixed $value): void
{
    Setting::updateOrCreate(['key' => $key], ['value' => $value, 'updated_at' => now()]);
    Cache::flush();
}

function pairAgent(array $attrs = []): Agent
{
    static $n = 100;
    $n++;

    return Agent::create(array_merge([
        'display_number' => $n,
        'telegram_username' => 'pair_agent_'.$n,
        'status' => Agent::STATUS_ACTIVE,
        'live_until' => now()->addHours(2),
    ], $attrs));
}

function pairOffline(Agent ...$agents): void
{
    foreach ($agents as $a) {
        $a->update(['live_until' => now()->subMinute()]);
    }
}

function pairOnline(Agent ...$agents): void
{
    foreach ($agents as $a) {
        $a->update(['live_until' => now()->addHours(2)]);
    }
}

function withdrawer(array $attrs = []): Agent
{
    return pairAgent(array_merge([
        'accepts_withdrawals' => true,
        'withdrawal_max' => 10000,
        'withdrawal_id' => 'WD'.random_int(1000, 9999),
    ], $attrs));
}

/** POST /api/public/pair and return the agent ids shown. */
function pairIds($test, string $device, string $player, string $intent = 'deposit', array $extra = []): array
{
    $res = $test->postJson('/api/public/pair', array_merge([
        'device_id' => $device,
        'player_id' => $player,
        'intent' => $intent,
    ], $extra));
    $res->assertOk();

    $ids = collect($res->json('agents'))->pluck('id')->all();
    sort($ids);

    return $ids;
}

/** Move the clock forward so "most recently shown" is unambiguous. */
function later(int $minutes = 5): void
{
    Carbon::setTestNow(now()->addMinutes($minutes));
}

function ids(Agent ...$agents): array
{
    $ids = array_map(fn (Agent $a) => $a->id, $agents);
    sort($ids);

    return $ids;
}

const DEV1 = 'device-1111111111111111';
const DEV2 = 'device-2222222222222222';
const DEV3 = 'device-3333333333333333';

// --- Basics ---------------------------------------------------------------

it('shows exactly two online agents and never offline ones', function () {
    $live = collect(range(1, 5))->map(fn () => pairAgent());
    $offline = collect(range(1, 3))->map(fn () => pairAgent(['live_until' => now()->subHour()]));

    $res = $this->postJson('/api/public/pair', [
        'device_id' => DEV1, 'player_id' => 'P100', 'intent' => 'deposit',
    ]);

    $res->assertOk()->assertJson(['enabled' => true, 'partial' => false]);
    $shown = collect($res->json('agents'));
    expect($shown)->toHaveCount(2);
    expect($shown->pluck('id')->diff($live->pluck('id')))->toBeEmpty();
    expect($shown->pluck('id')->intersect($offline->pluck('id')))->toBeEmpty();
});

it('never sends agent numbers or pin flags to the player', function () {
    pairAgent(['pinned_at' => now()]);
    pairAgent();

    $agents = $this->postJson('/api/public/pair', [
        'device_id' => DEV1, 'player_id' => 'P100', 'intent' => 'deposit',
    ])->json('agents');

    foreach ($agents as $a) {
        expect($a)->not->toHaveKey('display_number');
        expect($a)->not->toHaveKey('is_pinned');
        expect($a)->toHaveKeys(['id', 'telegram_username', 'status', 'payment_methods']);
    }
});

it('ignores pins — a pinned agent is not forced into anyone\'s pair', function () {
    $pinned = pairAgent(['pinned_at' => now()->subDay()]);
    foreach (range(1, 8) as $i) {
        pairAgent();
    }

    $timesPinnedShown = 0;
    foreach (range(1, 12) as $i) {
        if (in_array($pinned->id, pairIds($this, 'device-random-'.str_pad((string) $i, 10, '0'), 'PLAYER'.$i))) {
            $timesPinnedShown++;
        }
    }

    // With a pinned-first rule it would appear 12/12 times.
    expect($timesPinnedShown)->toBeLessThan(12);
});

it('returns fewer agents when fewer are online, and none when nobody is', function () {
    $only = pairAgent();
    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($only));

    pairOffline($only);
    expect(pairIds($this, DEV1, 'P100'))->toBe([]);
});

it('respects the admin pair size', function () {
    pairSetting('pair_size', 3);
    foreach (range(1, 6) as $i) {
        pairAgent();
    }

    expect(pairIds($this, DEV1, 'P100'))->toHaveCount(3);
});

it('does nothing when the pair rule is off', function () {
    pairSetting('pair_mode_enabled', false);
    pairAgent();

    $this->postJson('/api/public/pair', [
        'device_id' => DEV1, 'player_id' => 'P100', 'intent' => 'deposit',
    ])->assertOk()->assertExactJson(['enabled' => false, 'agents' => [], 'partial' => false]);

    expect(PlayerAgentAssignment::count())->toBe(0);
});

it('excludes disabled and deleted agents', function () {
    $disabled = pairAgent(['status' => Agent::STATUS_DISABLED]);
    $deleted = pairAgent();
    $deleted->delete();
    $ok = pairAgent();

    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($ok));
});

it('validates the request', function (array $body) {
    $this->postJson('/api/public/pair', $body)->assertStatus(422);
})->with([
    'missing player id' => [['device_id' => DEV1, 'intent' => 'deposit']],
    'bad player id' => [['device_id' => DEV1, 'player_id' => 'x', 'intent' => 'deposit']],
    'short device id' => [['device_id' => 'abc', 'player_id' => 'P100', 'intent' => 'deposit']],
    'bad intent' => [['device_id' => DEV1, 'player_id' => 'P100', 'intent' => 'contact']],
    'withdrawal without amount' => [['device_id' => DEV1, 'player_id' => 'P100', 'intent' => 'withdrawal']],
]);

// --- Same agents again ----------------------------------------------------

it('gives the same agents on every visit', function () {
    foreach (range(1, 8) as $i) {
        pairAgent();
    }

    $first = pairIds($this, DEV1, 'P100');
    foreach (range(1, 5) as $i) {
        later();
        expect(pairIds($this, DEV1, 'P100'))->toBe($first);
    }
});

it('gives a NEW account on the same device the same agents', function () {
    foreach (range(1, 8) as $i) {
        pairAgent();
    }

    $first = pairIds($this, DEV1, 'P100');
    later();
    expect(pairIds($this, DEV1, 'NEWACCOUNT'))->toBe($first);
});

it('gives the same account on ANOTHER device the same agents', function () {
    foreach (range(1, 8) as $i) {
        pairAgent();
    }

    $first = pairIds($this, DEV1, 'P100');
    later();
    expect(pairIds($this, DEV2, 'P100'))->toBe($first);
});

it('treats player and device ids case-insensitively', function () {
    foreach (range(1, 8) as $i) {
        pairAgent();
    }

    $first = pairIds($this, DEV1, 'abc123');
    later();
    expect(pairIds($this, strtoupper(DEV1), 'ABC123'))->toBe($first);
});

// --- Replacement and "previous agents first" ------------------------------

it('replaces only the agent who went offline, with a new random one', function () {
    [$a, $b] = [pairAgent(), pairAgent()];
    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($a, $b));

    $c = pairAgent();
    pairOffline($b);
    later();

    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($a, $c));
    // B is still remembered as one of the player's agents.
    expect(PlayerAgentAssignment::where('subject_key', 'p100')->pluck('agent_id')->sort()->values()->all())
        ->toBe(ids($a, $b, $c));
});

it('goes back to a previous agent before giving a brand-new one', function () {
    [$a, $b] = [pairAgent(), pairAgent()];
    pairIds($this, DEV1, 'P100');                     // A, B

    $c = pairAgent();
    pairOffline($b);
    later();
    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($a, $c)); // A, C

    // Now C is gone and B is back — and there are plenty of fresh agents.
    foreach (range(1, 5) as $i) {
        pairAgent();
    }
    pairOffline($c);
    pairOnline($b);
    later();

    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($a, $b));
});

it('keeps the most recently shown pair when every previous agent is online', function () {
    [$a, $b] = [pairAgent(), pairAgent()];
    pairIds($this, DEV1, 'P100');                     // A, B

    $c = pairAgent();
    pairOffline($b);
    later();
    pairIds($this, DEV1, 'P100');                     // A, C

    pairOnline($b);
    later();
    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($a, $c));
});

it('only gives new agents when none of the previous ones are online', function () {
    [$a, $b] = [pairAgent(), pairAgent()];
    pairIds($this, DEV1, 'P100');

    pairOffline($a, $b);
    [$c, $d] = [pairAgent(), pairAgent()];
    later();

    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($c, $d));
    expect(PlayerAgentAssignment::where('subject_type', 'device')->where('subject_key', strtolower(DEV1))->count())->toBe(4);
});

// --- Login merge ------------------------------------------------------------

it('merges device and account agents when an account logs in on another device', function () {
    [$a, $b] = [pairAgent(), pairAgent()];
    pairIds($this, DEV1, 'PL1');                       // device 1 / P1: A, B

    // P2 on its own device gets C, D (A and B are offline at the time).
    pairOffline($a, $b);
    [$c, $d] = [pairAgent(), pairAgent()];
    later();
    expect(pairIds($this, DEV2, 'PL2'))->toBe(ids($c, $d));

    // P2 logs in on device 1 (the widget calls sync on login).
    pairOnline($a, $b);
    later();
    $this->postJson('/api/public/pair/sync', ['device_id' => DEV1, 'player_id' => 'PL2'])
        ->assertOk()->assertJson(['ok' => true]);

    // Both memories now hold A, B, C, D.
    foreach ([['device', strtolower(DEV1)], ['player', 'pl2']] as [$type, $key]) {
        expect(PlayerAgentAssignment::where('subject_type', $type)->where('subject_key', $key)
            ->pluck('agent_id')->sort()->values()->all())->toBe(ids($a, $b, $c, $d));
    }

    // Back on device 2, if C and D are offline, P2 gets A and B (from the
    // merged memory), not brand-new agents.
    foreach (range(1, 5) as $i) {
        pairAgent();
    }
    pairOffline($c, $d);
    later();
    expect(pairIds($this, DEV2, 'PL2'))->toBe(ids($a, $b));
});

it('login sync copies the device agents to the player id', function () {
    foreach (range(1, 8) as $i) {
        pairAgent();
    }
    $first = pairIds($this, DEV1, 'PL1');

    $this->postJson('/api/public/pair/sync', ['device_id' => DEV1, 'player_id' => 'PL9'])->assertOk();

    // P9 on a completely new device gets the device-1 agents.
    later();
    expect(pairIds($this, DEV3, 'PL9'))->toBe($first);
});

it('login sync does not change which agents were shown last', function () {
    foreach (range(1, 4) as $i) {
        pairAgent();
    }
    pairIds($this, DEV1, 'PL1');
    $before = PlayerAgentAssignment::orderBy('id')->get(['agent_id', 'last_shown_at'])->toArray();

    later();
    $this->postJson('/api/public/pair/sync', ['device_id' => DEV1, 'player_id' => 'PL1'])->assertOk();

    $after = PlayerAgentAssignment::orderBy('id')->get(['agent_id', 'last_shown_at'])->toArray();
    expect($after)->toBe($before);
});

// --- Withdrawals ------------------------------------------------------------

it('uses the deposit agents for withdrawals when they can pay', function () {
    [$a, $b] = [withdrawer(), withdrawer()];
    foreach (range(1, 4) as $i) {
        withdrawer();
    }

    $deposit = pairIds($this, DEV1, 'P100');
    later();
    expect(pairIds($this, DEV1, 'P100', 'withdrawal', ['amount' => 1000]))->toBe($deposit);
});

it('replaces only the deposit agent who cannot pay out, and keeps deposits unchanged', function () {
    $a = withdrawer();
    $b = pairAgent(); // deposit-only
    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($a, $b));

    $w = withdrawer();
    later();
    expect(pairIds($this, DEV1, 'P100', 'withdrawal', ['amount' => 1000]))->toBe(ids($a, $w));

    // The next deposit still shows the deposit pair, not the withdrawal agent.
    later();
    expect(pairIds($this, DEV1, 'P100'))->toBe(ids($a, $b));

    // And the next withdrawal is stable too.
    later();
    expect(pairIds($this, DEV1, 'P100', 'withdrawal', ['amount' => 1000]))->toBe(ids($a, $w));
});

it('only shows withdrawal agents who cover the amount and pay to the chosen bank', function () {
    $telebirr = PaymentMethod::create(['slug' => 'telebirr', 'display_name' => 'TeleBirr', 'display_order' => 1]);
    $cbe = PaymentMethod::create(['slug' => 'cbe', 'display_name' => 'CBE Birr', 'display_order' => 2]);

    $small = withdrawer(['withdrawal_max' => 500]);
    $small->withdrawalMethods()->attach($telebirr->id);
    $wrongBank = withdrawer(['withdrawal_max' => 50000]);
    $wrongBank->withdrawalMethods()->attach($cbe->id);
    $good = withdrawer(['withdrawal_max' => 50000]);
    $good->withdrawalMethods()->attach($telebirr->id);

    expect(pairIds($this, DEV1, 'P100', 'withdrawal', ['amount' => 3000, 'bank' => 'Telebirr']))
        ->toBe(ids($good));
});

it('shows the closest agents (flagged partial) when nobody covers the amount', function () {
    $x = withdrawer(['withdrawal_max' => 1000]);
    $y = withdrawer(['withdrawal_max' => 5000]);
    $z = withdrawer(['withdrawal_max' => 3000]);

    $res = $this->postJson('/api/public/pair', [
        'device_id' => DEV1, 'player_id' => 'P100', 'intent' => 'withdrawal', 'amount' => 90000,
    ])->assertOk();

    expect($res->json('partial'))->toBeTrue();
    expect(collect($res->json('agents'))->pluck('id')->all())->toBe([$y->id, $z->id]);
});

it('shows nothing when nobody covers the amount and the admin chose "empty"', function () {
    pairSetting('withdrawal_no_match_behavior', 'empty');
    withdrawer(['withdrawal_max' => 1000]);

    expect(pairIds($this, DEV1, 'P100', 'withdrawal', ['amount' => 90000]))->toBe([]);
});

// --- Public agents endpoint in pair mode -----------------------------------

it('stops sending the full list, directory and count to the browser', function () {
    foreach (range(1, 6) as $i) {
        pairAgent();
    }
    pairAgent(['live_until' => now()->subMinutes(5)]);

    $res = $this->getJson('/api/public/agents')->assertOk();

    // Only a small sample (for widgets saved from before the pair rule).
    expect($res->json('agents'))->toHaveCount(2);
    expect($res->json('live_count'))->toBe(2);
    expect($res->json('directory'))->toBe([]);
    expect($res->json())->not->toHaveKey('pair_pool');
    expect($res->json('agents_available'))->toBeTrue();
    expect($res->json('settings.pair_mode_enabled'))->toBeTrue();
    expect($res->json('settings.pair_size'))->toBe(2);
    expect($res->json('settings.recents_enabled'))->toBeFalse();
    expect($res->json('settings.show_offline_agents'))->toBeFalse();
});

it('gives widgets saved from before the pair rule online agents instead of "no agents"', function () {
    $online = collect(range(1, 6))->map(fn () => pairAgent(['pinned_at' => now()]));
    $offline = pairAgent(['live_until' => now()->subMinutes(5)]);

    $agents = collect($this->getJson('/api/public/agents')->json('agents'));

    expect($agents)->toHaveCount(2);
    expect($agents->pluck('id')->diff($online->pluck('id')))->toBeEmpty();
    expect($agents->pluck('id'))->not->toContain($offline->id);
    foreach ($agents as $a) {
        expect($a['status'])->toBe('live');
        // Old widgets print display_number; blank so no number shows.
        expect(trim($a['display_number']))->toBe('');
        expect($a['is_pinned'])->toBeFalse();
    }
});

it('keeps the same sample for the same visitor within the hour', function () {
    foreach (range(1, 12) as $i) {
        pairAgent();
    }

    $ua = ['User-Agent' => 'Mozilla/5.0 (Linux; Android 14) PlayerPhone'];
    $first = collect($this->withHeaders($ua)->getJson('/api/public/agents')->json('agents'))->pluck('id')->all();

    Carbon::setTestNow(now()->addMinutes(20));
    Cache::flush();
    $again = collect($this->withHeaders($ua)->getJson('/api/public/agents')->json('agents'))->pluck('id')->all();

    expect($again)->toBe($first);
});

it('spreads different visitors across different agents', function () {
    foreach (range(1, 12) as $i) {
        pairAgent();
    }

    $seen = collect();
    foreach (range(1, 15) as $i) {
        $ids = $this->withHeaders(['User-Agent' => "Phone model {$i}"])
            ->getJson('/api/public/agents')->json('agents');
        $seen = $seen->merge(collect($ids)->pluck('id'));
    }

    // 15 visitors x 2 agents from a pool of 12 should touch many agents.
    expect($seen->unique()->count())->toBeGreaterThan(4);
});

it('sends an empty sample when nobody is online', function () {
    pairAgent(['live_until' => now()->subMinutes(5)]);

    $res = $this->getJson('/api/public/agents')->assertOk();
    expect($res->json('agents'))->toBe([]);
    expect($res->json('live_count'))->toBe(0);
    expect($res->json('agents_available'))->toBeFalse();
});

it('keeps the classic list when the pair rule is off', function () {
    pairSetting('pair_mode_enabled', false);
    pairAgent();
    pairAgent();

    $res = $this->getJson('/api/public/agents')->assertOk();

    expect($res->json('agents'))->toHaveCount(2);
    expect($res->json('live_count'))->toBe(2);
    expect($res->json('settings.pair_mode_enabled'))->toBeFalse();
});

it('reports no agents available when nobody is online', function () {
    pairAgent(['live_until' => now()->subMinutes(5)]);

    expect($this->getJson('/api/public/agents')->json('agents_available'))->toBeFalse();
});

// --- Pair reset (admin switch + hours) --------------------------------------

function allOnline(): void
{
    Agent::query()->update(['live_until' => now()->addHours(2)]);
}

function pairReset(bool $on, int $hours = 72): void
{
    pairSetting('pair_reset_enabled', $on);
    pairSetting('pair_reset_hours', $hours);
}

it('resets the pair after the admin interval and gives new agents', function () {
    pairReset(true, 72);
    foreach (range(1, 6) as $i) {
        pairAgent();
    }

    $first = pairIds($this, DEV1, 'PL100');

    Carbon::setTestNow(now()->addHours(73));
    allOnline();

    $second = pairIds($this, DEV1, 'PL100');
    expect($second)->toHaveCount(2);
    expect(array_values(array_intersect($first, $second)))->toBe([]);
    // The old pairing is forgotten; only the new one is remembered.
    expect(PlayerAgentAssignment::where('subject_type', 'player')->where('subject_key', 'pl100')
        ->pluck('agent_id')->sort()->values()->all())->toBe($second);
});

it('keeps the pair until the interval is over', function () {
    pairReset(true, 72);
    foreach (range(1, 6) as $i) {
        pairAgent();
    }

    $first = pairIds($this, DEV1, 'PL100');

    Carbon::setTestNow(now()->addHours(71));
    allOnline();

    expect(pairIds($this, DEV1, 'PL100'))->toBe($first);
});

it('never resets while the reset switch is off', function () {
    pairReset(false, 1);
    foreach (range(1, 6) as $i) {
        pairAgent();
    }

    $first = pairIds($this, DEV1, 'PL100');

    Carbon::setTestNow(now()->addDays(30));
    allOnline();

    expect(pairIds($this, DEV1, 'PL100'))->toBe($first);
});

it('counts from when the pair started, not from the last visit', function () {
    pairReset(true, 72);
    foreach (range(1, 6) as $i) {
        pairAgent();
    }

    $first = pairIds($this, DEV1, 'PL100');

    // Daily visits don't extend the pairing...
    foreach ([1, 2] as $day) {
        Carbon::setTestNow(now()->addHours(24));
        allOnline();
        expect(pairIds($this, DEV1, 'PL100'))->toBe($first);
    }

    // ...73 hours after it started, it resets.
    Carbon::setTestNow(now()->addHours(25));
    allOnline();
    expect(array_values(array_intersect($first, pairIds($this, DEV1, 'PL100'))))->toBe([]);
});

it('reuses previous agents after a reset only when nobody new is online', function () {
    pairReset(true, 72);
    [$a, $b] = [pairAgent(), pairAgent()];
    pairIds($this, DEV1, 'PL100');                    // A, B
    $c = pairAgent();

    Carbon::setTestNow(now()->addHours(73));
    allOnline();

    // Only C is new, so the second slot has to reuse A or B.
    $after = pairIds($this, DEV1, 'PL100');
    expect($after)->toHaveCount(2)->toContain($c->id);
});

it('resets the player on every device, not just the one that triggered it', function () {
    pairReset(true, 72);
    foreach (range(1, 8) as $i) {
        pairAgent();
    }

    pairIds($this, DEV1, 'PL100');

    Carbon::setTestNow(now()->addHours(73));
    allOnline();
    $reset = pairIds($this, DEV1, 'PL100');

    Carbon::setTestNow(now()->addMinutes(5));
    expect(pairIds($this, DEV2, 'PL100'))->toBe($reset);
});

it('applies the reset to withdrawals too', function () {
    pairReset(true, 72);
    foreach (range(1, 6) as $i) {
        withdrawer();
    }

    $first = pairIds($this, DEV1, 'PL100', 'withdrawal', ['amount' => 1000]);

    Carbon::setTestNow(now()->addHours(73));
    allOnline();

    $second = pairIds($this, DEV1, 'PL100', 'withdrawal', ['amount' => 1000]);
    expect(array_values(array_intersect($first, $second)))->toBe([]);
});
