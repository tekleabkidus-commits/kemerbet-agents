<?php

use App\Models\Agent;
use App\Models\ClickEvent;
use App\Models\DailyStat;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->agent = Agent::create([
        'display_number' => 1,
        'telegram_username' => 'CMDTEST',
        'status' => 'active',
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
});

function seedClick(Agent $agent, string $eatTime): void
{
    ClickEvent::create([
        'agent_id' => $agent->id,
        'click_type' => 'deposit',
        'visitor_id' => 'v_'.uniqid(),
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::parse($eatTime),
    ]);
}

// 1. Default (no args): rolls up yesterday
it('rolls up yesterday by default', function () {
    Carbon::setTestNow('2026-04-30 12:00:00');

    seedClick($this->agent, '2026-04-29 10:00:00');

    $this->artisan('agents:rollup-daily')->assertExitCode(0);

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->date->toDateString())->toBe('2026-04-29')
        ->and($row->deposit_clicks)->toBe(1);
});

// 2. --date flag: rolls up specific date
it('rolls up specific date when --date flag is provided', function () {
    seedClick($this->agent, '2026-04-28 14:00:00');

    $this->artisan('agents:rollup-daily', ['--date' => '2026-04-28'])->assertExitCode(0);

    $row = DailyStat::where('agent_id', $this->agent->id)->sole();
    expect($row->date->toDateString())->toBe('2026-04-28')
        ->and($row->deposit_clicks)->toBe(1);
});

// 3. --days flag: rolls up last N days with exact date coverage
it('rolls up last N days when --days flag is provided', function () {
    Carbon::setTestNow('2026-04-30 12:00:00');

    seedClick($this->agent, '2026-04-26 10:00:00'); // outside range
    seedClick($this->agent, '2026-04-27 10:00:00');
    seedClick($this->agent, '2026-04-28 10:00:00');
    seedClick($this->agent, '2026-04-29 10:00:00');
    seedClick($this->agent, '2026-04-30 10:00:00'); // today, not rolled up

    $this->artisan('agents:rollup-daily', ['--days' => 3])->assertExitCode(0);

    // --days=3 from 2026-04-30: subDays(3)=Apr27, subDays(2)=Apr28, subDays(1)=Apr29
    $agentDates = DailyStat::whereNotNull('agent_id')
        ->orderBy('date')
        ->pluck('date')
        ->map(fn ($d) => $d->toDateString())
        ->all();

    expect($agentDates)->toBe(['2026-04-27', '2026-04-28', '2026-04-29']);
});
