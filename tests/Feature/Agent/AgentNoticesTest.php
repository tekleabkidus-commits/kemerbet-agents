<?php

use App\Models\Admin;
use App\Models\Agent;
use App\Models\AgentToken;
use App\Models\Notice;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
        'name' => 'Kidus',
    ]);

    $this->agent = Agent::create([
        'display_number' => 7,
        'telegram_username' => 'NOTICES7',
        'status' => 'active',
    ]);

    $this->tokenValue = bin2hex(random_bytes(32));
    AgentToken::create([
        'agent_id' => $this->agent->id,
        'token' => $this->tokenValue,
        'created_at' => now(),
    ]);
});

// 1. Agent state includes visible notices in the expected shape
test('agent state includes currently visible notices', function () {
    $notice = Notice::create([
        'title' => 'Heads up',
        'body' => 'New payout schedule this weekend.',
        'priority' => 'urgent',
        'created_by' => $this->admin->id,
    ]);

    $response = $this->getJson("/api/agent/{$this->tokenValue}/state");

    $response->assertOk();
    $notices = $response->json('notices');
    expect($notices)->toHaveCount(1);
    expect($notices[0]['id'])->toBe($notice->id)
        ->and($notices[0]['title'])->toBe('Heads up')
        ->and($notices[0]['body'])->toBe('New payout schedule this weekend.')
        ->and($notices[0]['priority'])->toBe('urgent');
    expect($notices[0])->toHaveKey('created_at');
});

// 2. Hidden notices (scheduled, expired, off) are not included
test('agent state excludes scheduled, expired, and inactive notices', function () {
    $visible = Notice::create([
        'body' => 'Visible now',
        'created_by' => $this->admin->id,
    ]);
    Notice::create([
        'body' => 'Future notice',
        'starts_at' => now()->addDay(),
        'created_by' => $this->admin->id,
    ]);
    Notice::create([
        'body' => 'Expired notice',
        'ends_at' => now()->subHour(),
        'created_by' => $this->admin->id,
    ]);
    Notice::create([
        'body' => 'Switched off',
        'is_active' => false,
        'created_by' => $this->admin->id,
    ]);

    $response = $this->getJson("/api/agent/{$this->tokenValue}/state");

    $response->assertOk();
    $notices = $response->json('notices');
    expect($notices)->toHaveCount(1);
    expect($notices[0]['id'])->toBe($visible->id);
});

// 3. Empty list when no notices exist
test('agent state returns empty notices array when none exist', function () {
    $response = $this->getJson("/api/agent/{$this->tokenValue}/state");

    $response->assertOk();
    expect($response->json('notices'))->toBe([]);
});
