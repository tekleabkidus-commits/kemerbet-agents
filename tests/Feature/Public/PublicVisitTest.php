<?php

use App\Models\VisitEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function visitUrl(): string
{
    return '/api/public/visit';
}

// 1. POST returns 200 with { ok: true }
it('returns 200 and ok true', function () {
    $this->postJson(visitUrl())
        ->assertOk()
        ->assertJson(['ok' => true]);
});

// 2. Creates visit_event row with all expected fields
it('creates visit_event with all fields populated', function () {
    $this->postJson(visitUrl(), ['referrer' => 'https://kemerbet.com/deposit'], [
        'REMOTE_ADDR' => '10.0.0.1',
        'HTTP_USER_AGENT' => 'TestBrowser/2.0',
    ]);

    $visit = VisitEvent::sole();
    expect($visit->visitor_id)->not->toBeEmpty()
        ->and($visit->ip_address)->not->toBeNull()
        ->and($visit->user_agent)->not->toBeNull()
        ->and($visit->referrer)->toBe('https://kemerbet.com/deposit')
        ->and($visit->created_at)->not->toBeNull();
});

// 3. visitor_id is salted xxh3 hash of IP + user_agent
it('visitor_id is salted hash of ip and user_agent', function () {
    $this->postJson(visitUrl(), [], [
        'REMOTE_ADDR' => '192.168.1.100',
        'HTTP_USER_AGENT' => 'Chrome/125',
    ]);

    $visit = VisitEvent::sole();
    $expected = hash('xxh3', config('app.key').'192.168.1.100'.'Chrome/125');
    expect($visit->visitor_id)->toBe($expected);
});

// 4. referrer is nullable when omitted
it('referrer is null when not provided', function () {
    $this->postJson(visitUrl());

    expect(VisitEvent::sole()->referrer)->toBeNull();
});

// 5. referrer captured when provided
it('captures referrer when provided', function () {
    $this->postJson(visitUrl(), ['referrer' => 'https://example.com/page']);

    expect(VisitEvent::sole()->referrer)->toBe('https://example.com/page');
});

// 6. referrer >2000 chars returns 422
it('returns 422 when referrer exceeds 2000 chars', function () {
    $this->postJson(visitUrl(), ['referrer' => str_repeat('x', 2001)])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['referrer']);
});

// 7. Multiple visits from same IP create separate rows
it('creates separate rows for multiple visits from same IP', function () {
    $this->postJson(visitUrl(), [], ['REMOTE_ADDR' => '10.0.0.1']);
    $this->postJson(visitUrl(), [], ['REMOTE_ADDR' => '10.0.0.1']);
    $this->postJson(visitUrl(), [], ['REMOTE_ADDR' => '10.0.0.1']);

    expect(VisitEvent::count())->toBe(3);
});
