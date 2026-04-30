<?php

use App\Models\Agent;
use App\Models\NotificationLog;
use App\Models\PushSubscription;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createNotifAgent(array $attrs = []): Agent
{
    static $counter = 100;

    return Agent::create(array_merge([
        'display_number' => $counter++,
        'telegram_username' => 'notif_agent'.$counter,
        'status' => Agent::STATUS_ACTIVE,
    ], $attrs));
}

// --- push_subscriptions table ---

test('push_subscriptions migration creates table with expected columns', function () {
    $agent = createNotifAgent();

    $sub = PushSubscription::create([
        'agent_id' => $agent->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/test123',
        'p256dh_key' => str_repeat('A', 88),
        'auth_key' => str_repeat('B', 24),
        'user_agent' => 'Mozilla/5.0 Test',
        'is_active' => true,
    ]);

    expect($sub)->toBeInstanceOf(PushSubscription::class);
    expect($sub->agent_id)->toBe($agent->id);
    expect($sub->is_active)->toBeTrue();
    expect($sub->last_used_at)->toBeNull();
    expect($sub->failed_at)->toBeNull();
});

test('push_subscriptions unique constraint prevents duplicate agent+endpoint', function () {
    $agent = createNotifAgent();
    $endpoint = 'https://fcm.googleapis.com/fcm/send/duplicate';

    PushSubscription::create([
        'agent_id' => $agent->id,
        'endpoint' => $endpoint,
        'p256dh_key' => str_repeat('A', 88),
        'auth_key' => str_repeat('B', 24),
    ]);

    expect(fn () => PushSubscription::create([
        'agent_id' => $agent->id,
        'endpoint' => $endpoint,
        'p256dh_key' => str_repeat('C', 88),
        'auth_key' => str_repeat('D', 24),
    ]))->toThrow(QueryException::class);
});

test('push_subscriptions allows same endpoint for different agents', function () {
    $agent1 = createNotifAgent();
    $agent2 = createNotifAgent();
    $endpoint = 'https://fcm.googleapis.com/fcm/send/shared';

    PushSubscription::create([
        'agent_id' => $agent1->id,
        'endpoint' => $endpoint,
        'p256dh_key' => str_repeat('A', 88),
        'auth_key' => str_repeat('B', 24),
    ]);

    $sub2 = PushSubscription::create([
        'agent_id' => $agent2->id,
        'endpoint' => $endpoint,
        'p256dh_key' => str_repeat('C', 88),
        'auth_key' => str_repeat('D', 24),
    ]);

    expect($sub2->exists)->toBeTrue();
});

test('scopeActive filters to active subscriptions only', function () {
    $agent = createNotifAgent();

    PushSubscription::factory()->for($agent)->create(['is_active' => true]);
    PushSubscription::factory()->for($agent)->create(['is_active' => true]);
    PushSubscription::factory()->for($agent)->inactive()->create();

    expect(PushSubscription::where('agent_id', $agent->id)->active()->count())->toBe(2);
    expect(PushSubscription::where('agent_id', $agent->id)->count())->toBe(3);
});

// --- notification_log table ---

test('notification_log migration creates table with expected columns', function () {
    $agent = createNotifAgent();
    $refTime = Carbon::parse('2026-04-30 07:00:00');

    $log = NotificationLog::create([
        'agent_id' => $agent->id,
        'notification_type' => NotificationLog::TYPE_WAKEUP_7AM,
        'reference_timestamp' => $refTime,
        'payload' => ['title' => 'Good morning!', 'body' => 'Players are waiting.'],
    ]);

    expect($log)->toBeInstanceOf(NotificationLog::class);
    expect($log->notification_type)->toBe('wakeup_7am');
    expect($log->reference_timestamp->toDateTimeString())->toBe('2026-04-30 07:00:00');
    expect($log->payload)->toBe(['title' => 'Good morning!', 'body' => 'Players are waiting.']);
    expect($log->fresh()->created_at)->not->toBeNull();
});

test('hasFired returns true when matching log entry exists', function () {
    $agent = createNotifAgent();
    $refTime = Carbon::parse('2026-04-30 10:00:00');

    NotificationLog::create([
        'agent_id' => $agent->id,
        'notification_type' => NotificationLog::TYPE_PRE_EXPIRATION_15,
        'reference_timestamp' => $refTime,
    ]);

    expect(NotificationLog::hasFired($agent, NotificationLog::TYPE_PRE_EXPIRATION_15, $refTime))->toBeTrue();
});

test('hasFired returns false when no matching log entry exists', function () {
    $agent = createNotifAgent();
    $refTime = Carbon::parse('2026-04-30 10:00:00');

    // Different type
    NotificationLog::create([
        'agent_id' => $agent->id,
        'notification_type' => NotificationLog::TYPE_PRE_EXPIRATION_15,
        'reference_timestamp' => $refTime,
    ]);

    expect(NotificationLog::hasFired($agent, NotificationLog::TYPE_PRE_EXPIRATION_10, $refTime))->toBeFalse();

    // Different reference_timestamp
    $otherTime = Carbon::parse('2026-04-30 11:00:00');
    expect(NotificationLog::hasFired($agent, NotificationLog::TYPE_PRE_EXPIRATION_15, $otherTime))->toBeFalse();
});
