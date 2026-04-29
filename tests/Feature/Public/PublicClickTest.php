<?php

use App\Models\Agent;
use App\Models\ClickEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function clickUrl(int $id): string
{
    return "/api/public/agents/{$id}/click";
}

function createAgent(array $attrs = []): Agent
{
    static $counter = 100;

    return Agent::create(array_merge([
        'display_number' => $counter++,
        'telegram_username' => 'click_agent'.$counter,
        'status' => Agent::STATUS_ACTIVE,
    ], $attrs));
}

// --- Test 1: success path ---

it('returns 200 and creates click_event for active agent', function () {
    $agent = createAgent();

    $response = $this->postJson(clickUrl($agent->id));

    $response->assertOk()
        ->assertJsonPath('ok', true);

    $this->assertDatabaseCount('click_events', 1);
    $this->assertDatabaseHas('click_events', [
        'agent_id' => $agent->id,
    ]);
});

// --- Test 2: captures IP address ---

it('captures IP address', function () {
    $agent = createAgent();

    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.42'])
        ->postJson(clickUrl($agent->id));

    $click = ClickEvent::first();
    expect($click->ip_address)->toBe('203.0.113.42');
});

// --- Test 3: captures referrer when provided ---

it('captures referrer when provided', function () {
    $agent = createAgent();

    $this->postJson(clickUrl($agent->id), [
        'referrer' => 'https://example.com/deposit',
    ]);

    $click = ClickEvent::first();
    expect($click->referrer)->toBe('https://example.com/deposit');
});

// --- Test 4: referrer null when not provided ---

it('referrer is null when not provided', function () {
    $agent = createAgent();

    $this->postJson(clickUrl($agent->id));

    $click = ClickEvent::first();
    expect($click->referrer)->toBeNull();
});

// --- Test 5: referrer exceeds 2000 chars ---

it('returns 422 when referrer exceeds 2000 chars', function () {
    $agent = createAgent();

    $response = $this->postJson(clickUrl($agent->id), [
        'referrer' => str_repeat('a', 2001),
    ]);

    $response->assertStatus(422);
    $this->assertDatabaseCount('click_events', 0);
});

// --- Test 6: nonexistent agent ---

it('returns 404 for nonexistent agent', function () {
    $response = $this->postJson(clickUrl(99999));

    $response->assertNotFound();
    $this->assertDatabaseCount('click_events', 0);
});

// --- Test 7: disabled agent ---

it('returns 422 for disabled agent', function () {
    $agent = createAgent(['status' => Agent::STATUS_DISABLED]);

    $response = $this->postJson(clickUrl($agent->id));

    $response->assertStatus(422)
        ->assertJsonPath('message', 'Agent not available');

    $this->assertDatabaseCount('click_events', 0);
});

// --- Test 8: soft-deleted agent ---

it('returns 404 for soft-deleted agent', function () {
    $agent = createAgent();
    $agent->delete();

    $response = $this->postJson(clickUrl($agent->id));

    $response->assertNotFound();
    $this->assertDatabaseCount('click_events', 0);
});

// --- Test 9: click_type is deposit ---

it('click_type is deposit', function () {
    $agent = createAgent();

    $this->postJson(clickUrl($agent->id));

    $click = ClickEvent::first();
    expect($click->click_type)->toBe('deposit');
});

// --- Test 10: visitor_id is salted hash ---

it('visitor_id is salted hash of ip + user_agent', function () {
    $agent = createAgent();
    $userAgent = 'TestBrowser/1.0';

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
        ->withHeaders(['User-Agent' => $userAgent])
        ->postJson(clickUrl($agent->id));

    $expected = hash('xxh3', config('app.key').'10.0.0.1'.$userAgent);

    $click = ClickEvent::first();
    expect($click->visitor_id)->toBe($expected);
});
