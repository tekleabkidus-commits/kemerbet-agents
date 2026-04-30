<?php

use App\Models\Agent;
use App\Models\AgentToken;
use App\Models\NotificationLog;
use App\Services\NotificationDispatcher;
use App\Services\NotificationRuleEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->agent = Agent::create([
        'display_number' => 7,
        'telegram_username' => 'CRONTEST',
        'status' => 'active',
    ]);

    $this->tokenValue = bin2hex(random_bytes(32));
    AgentToken::create([
        'agent_id' => $this->agent->id,
        'token' => $this->tokenValue,
        'created_at' => now(),
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
});

// =====================================================================
// agents:check-reminders
// =====================================================================

// 1. Exits successfully
it('check-reminders exits with success code', function () {
    $this->artisan('agents:check-reminders')->assertExitCode(0);
});

// 2. Calls processDueNotifications on the rule engine
it('check-reminders calls processDueNotifications', function () {
    $mock = $this->mock(NotificationRuleEngine::class);
    $mock->expects('processDueNotifications')->once();

    $this->artisan('agents:check-reminders')->assertExitCode(0);
});

// =====================================================================
// agents:wakeup
// =====================================================================

// 3. Fires wakeup_7am to offline agent
it('wakeup fires wakeup_7am to offline agent', function () {
    Carbon::setTestNow(Carbon::parse('2026-04-30 07:00:00'));
    $this->agent->update(['live_until' => null]);

    $mock = $this->mock(NotificationDispatcher::class);
    $mock->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_WAKEUP_7AM);

    $this->artisan('agents:wakeup')->assertExitCode(0);
});

// 4. Does NOT fire to currently-live agent
it('wakeup does not fire to live agent', function () {
    Carbon::setTestNow(Carbon::parse('2026-04-30 07:00:00'));
    $this->agent->update(['live_until' => now()->addHour()]);

    $mock = $this->mock(NotificationDispatcher::class);
    $mock->shouldNotReceive('dispatchAndLog');

    $this->artisan('agents:wakeup')->assertExitCode(0);
});

// 5. Uses today 7am EAT as reference timestamp
it('wakeup uses today 7am EAT as reference timestamp', function () {
    Carbon::setTestNow(Carbon::parse('2026-04-30 07:00:00'));
    $this->agent->update(['live_until' => null]);

    $expectedRef = Carbon::parse('2026-04-30 07:00:00');

    $mock = $this->mock(NotificationDispatcher::class);
    $mock->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload, $refTimestamp) use ($expectedRef) {
            return $refTimestamp->equalTo($expectedRef);
        });

    $this->artisan('agents:wakeup')->assertExitCode(0);
});

// 6. Reference timestamp is always today 7am regardless of when command runs
it('wakeup uses consistent 7am reference regardless of run time', function () {
    $this->agent->update(['live_until' => null]);

    $expectedRef = Carbon::parse('2026-04-30 07:00:00');

    // Run at 7:30 AM
    Carbon::setTestNow(Carbon::parse('2026-04-30 07:30:00'));

    $mock = $this->mock(NotificationDispatcher::class);
    $mock->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type, $payload, $refTimestamp) => $refTimestamp->equalTo($expectedRef));

    $this->artisan('agents:wakeup')->assertExitCode(0);

    // Run again at 9:00 AM — same reference
    Mockery::close();
    Carbon::setTestNow(Carbon::parse('2026-04-30 09:00:00'));

    $mock2 = $this->mock(NotificationDispatcher::class);
    $mock2->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type, $payload, $refTimestamp) => $refTimestamp->equalTo($expectedRef));

    $this->artisan('agents:wakeup')->assertExitCode(0);
});

// 7. Skips disabled agents
it('wakeup skips disabled agents', function () {
    Carbon::setTestNow(Carbon::parse('2026-04-30 07:00:00'));
    $this->agent->update(['status' => Agent::STATUS_DISABLED, 'live_until' => null]);

    $mock = $this->mock(NotificationDispatcher::class);
    $mock->shouldNotReceive('dispatchAndLog');

    $this->artisan('agents:wakeup')->assertExitCode(0);
});

// 8. Payload includes agent secret URL
it('wakeup payload includes agent secret url', function () {
    Carbon::setTestNow(Carbon::parse('2026-04-30 07:00:00'));
    $this->agent->update(['live_until' => null]);

    $mock = $this->mock(NotificationDispatcher::class);
    $mock->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload) {
            return $payload['url'] === '/a/'.$this->tokenValue
                && $payload['title'] === 'Good morning!'
                && str_contains($payload['body'], 'Players are waiting');
        });

    $this->artisan('agents:wakeup')->assertExitCode(0);
});
