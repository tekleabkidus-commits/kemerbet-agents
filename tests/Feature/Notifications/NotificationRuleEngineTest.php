<?php

use App\Models\Agent;
use App\Models\AgentToken;
use App\Models\NotificationLog;
use App\Models\StatusEvent;
use App\Services\NotificationDispatcher;
use App\Services\NotificationRuleEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->agent = Agent::create([
        'display_number' => 7,
        'telegram_username' => 'RULETEST',
        'status' => 'active',
    ]);

    $this->tokenValue = bin2hex(random_bytes(32));
    AgentToken::create([
        'agent_id' => $this->agent->id,
        'token' => $this->tokenValue,
        'created_at' => now(),
    ]);

    $this->mockDispatcher = Mockery::mock(NotificationDispatcher::class);
    $this->engine = new NotificationRuleEngine($this->mockDispatcher);
});

afterEach(function () {
    Carbon::setTestNow();
    Mockery::close();
});

// =====================================================================
// isNighttime
// =====================================================================

// 1. 23:00 EAT = nighttime
it('returns true for 23:00 EAT', function () {
    $moment = Carbon::parse('2026-04-30 23:00:00');
    expect($this->engine->isNighttime($moment))->toBeTrue();
});

// 2. 03:00 EAT = nighttime
it('returns true for 03:00 EAT', function () {
    $moment = Carbon::parse('2026-05-01 03:00:00');
    expect($this->engine->isNighttime($moment))->toBeTrue();
});

// 3. 07:00 EAT = daytime
it('returns false for 07:00 EAT', function () {
    $moment = Carbon::parse('2026-04-30 07:00:00');
    expect($this->engine->isNighttime($moment))->toBeFalse();
});

// 4. 22:59 EAT = daytime
it('returns false for 22:59 EAT', function () {
    $moment = Carbon::parse('2026-04-30 22:59:00');
    expect($this->engine->isNighttime($moment))->toBeFalse();
});

// =====================================================================
// detectExpiredSessions
// =====================================================================

// 5. Writes session_expired event for expired session without offline event
it('writes session_expired for an expired session', function () {
    $liveUntil = Carbon::parse('2026-04-30 10:00:00');
    $this->agent->update(['live_until' => $liveUntil]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    $now = Carbon::parse('2026-04-30 10:05:00');
    $this->engine->detectExpiredSessions($now);

    $expired = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_SESSION_EXPIRED)
        ->first();

    expect($expired)->not->toBeNull();
});

// 6. session_expired created_at = live_until (not now)
it('sets session_expired created_at to live_until', function () {
    $liveUntil = Carbon::parse('2026-04-30 10:00:00');
    $this->agent->update(['live_until' => $liveUntil]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    $now = Carbon::parse('2026-04-30 10:05:00');
    $this->engine->detectExpiredSessions($now);

    $expired = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_SESSION_EXPIRED)
        ->sole();

    expect($expired->created_at->toDateTimeString())->toBe('2026-04-30 10:00:00');
});

// 7. Skips agents who already have session_expired after went_online
it('skips agents who already have a session_expired event', function () {
    $liveUntil = Carbon::parse('2026-04-30 10:00:00');
    $this->agent->update(['live_until' => $liveUntil]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_SESSION_EXPIRED,
        'created_at' => Carbon::parse('2026-04-30 10:00:00'),
    ]);

    $now = Carbon::parse('2026-04-30 10:05:00');
    $this->engine->detectExpiredSessions($now);

    $count = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_SESSION_EXPIRED)
        ->count();

    expect($count)->toBe(1);
});

// 8. Skips agents who self-clicked go offline
it('skips agents who went offline manually', function () {
    $liveUntil = Carbon::parse('2026-04-30 10:00:00');
    $this->agent->update(['live_until' => $liveUntil]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => Carbon::parse('2026-04-30 09:00:00'),
    ]);

    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_OFFLINE,
        'created_at' => Carbon::parse('2026-04-30 09:30:00'),
    ]);

    $now = Carbon::parse('2026-04-30 10:05:00');
    $this->engine->detectExpiredSessions($now);

    $count = StatusEvent::where('agent_id', $this->agent->id)
        ->where('event_type', StatusEvent::EVENT_SESSION_EXPIRED)
        ->count();

    expect($count)->toBe(0);
});

// =====================================================================
// Rule 2: Pre-expiration warnings
// =====================================================================

// Helper: make agent live with N seconds remaining at $now
function makeAgentLive(Agent $agent, Carbon $now, int $secondsRemaining): void
{
    Carbon::setTestNow($now);

    $liveUntil = $now->copy()->addSeconds($secondsRemaining);
    $agent->update(['live_until' => $liveUntil]);

    StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => (int) ceil($secondsRemaining / 60),
        'created_at' => $now->copy()->subMinutes(30),
    ]);
}

// 9. Fires pre_expiration_15 when 15 min remain (daytime)
it('fires pre_expiration_15 at 15 minutes remaining daytime', function () {
    // 12:00 UTC = 15:00 EAT (daytime)
    $now = Carbon::parse('2026-04-30 12:00:00');
    makeAgentLive($this->agent, $now, 15 * 60);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_PRE_EXPIRATION_15);

    $this->engine->processDueNotifications($now);
});

// 10. Fires pre_expiration_10 when 10 min remain (daytime)
it('fires pre_expiration_10 at 10 minutes remaining daytime', function () {
    $now = Carbon::parse('2026-04-30 12:00:00');
    makeAgentLive($this->agent, $now, 10 * 60);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_PRE_EXPIRATION_10);

    $this->engine->processDueNotifications($now);
});

// 11. Fires pre_expiration_5 when 5 min remain (daytime)
it('fires pre_expiration_5 at 5 minutes remaining daytime', function () {
    $now = Carbon::parse('2026-04-30 12:00:00');
    makeAgentLive($this->agent, $now, 5 * 60);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_PRE_EXPIRATION_5);

    $this->engine->processDueNotifications($now);
});

// 12. Fires sleep_warning_5 when 5 min remain (nighttime)
it('fires sleep_warning_5 at 5 minutes remaining nighttime', function () {
    // 23:30 EAT (nighttime — app timezone is Africa/Addis_Ababa)
    $now = Carbon::parse('2026-04-30 23:30:00');
    makeAgentLive($this->agent, $now, 5 * 60);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_SLEEP_WARNING_5);

    $this->engine->processDueNotifications($now);
});

// 13. Does NOT fire pre_expiration_15 or _10 during nighttime
it('does not fire daytime warnings during nighttime', function () {
    // 23:30 EAT (nighttime)
    $now = Carbon::parse('2026-04-30 23:30:00');
    makeAgentLive($this->agent, $now, 15 * 60);

    $this->mockDispatcher->shouldNotReceive('dispatchAndLog');

    $this->engine->processDueNotifications($now);
});

// 14. Does NOT fire when outside tolerance window
it('does not fire when outside tolerance window', function () {
    $now = Carbon::parse('2026-04-30 12:00:00');
    // 14 minutes remaining — too late for 15, too early for 10
    makeAgentLive($this->agent, $now, 14 * 60);

    $this->mockDispatcher->shouldNotReceive('dispatchAndLog');

    $this->engine->processDueNotifications($now);
});

// 15. Does NOT fire when agent has 60 min remaining
it('does not fire when plenty of time remaining', function () {
    $now = Carbon::parse('2026-04-30 12:00:00');
    makeAgentLive($this->agent, $now, 60 * 60);

    $this->mockDispatcher->shouldNotReceive('dispatchAndLog');

    $this->engine->processDueNotifications($now);
});

// 16. Reference timestamp is live_until
it('uses live_until as reference timestamp for pre-expiration', function () {
    $now = Carbon::parse('2026-04-30 12:00:00');
    makeAgentLive($this->agent, $now, 15 * 60);

    $expectedLiveUntil = $now->copy()->addSeconds(15 * 60);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload, $refTimestamp) use ($expectedLiveUntil) {
            return $refTimestamp->equalTo($expectedLiveUntil);
        });

    $this->engine->processDueNotifications($now);
});

// 17. Payload contains correct url with agent token
it('includes agent secret url in pre-expiration payload', function () {
    $now = Carbon::parse('2026-04-30 12:00:00');
    makeAgentLive($this->agent, $now, 15 * 60);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload) {
            return $payload['url'] === '/a/'.$this->tokenValue;
        });

    $this->engine->processDueNotifications($now);
});

// 18. Dedup: dispatchAndLog is called but handles dedup internally
it('calls dispatchAndLog which handles dedup internally', function () {
    $now = Carbon::parse('2026-04-30 12:00:00');
    makeAgentLive($this->agent, $now, 15 * 60);

    // First call
    $this->mockDispatcher->expects('dispatchAndLog')
        ->twice()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_PRE_EXPIRATION_15)
        ->andReturn(1, 0); // first succeeds, second deduped

    $this->engine->processDueNotifications($now);
    $this->engine->processDueNotifications($now);
});

// =====================================================================
// Rule 3: Post-offline reminders
// =====================================================================

// Helper: make agent offline with an event at $eventTime
function makeAgentOffline(Agent $agent, Carbon $eventTime, string $eventType = StatusEvent::EVENT_WENT_OFFLINE): void
{
    $agent->update(['live_until' => $eventTime->copy()->subSecond()]);

    StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => $eventTime->copy()->subHour(),
    ]);

    StatusEvent::create([
        'agent_id' => $agent->id,
        'event_type' => $eventType,
        'created_at' => $eventTime,
    ]);
}

// 19. post_offline_15min fires 15 min after daytime went_offline
it('fires post_offline_15min at 15 min after daytime went_offline', function () {
    $offlineAt = Carbon::parse('2026-04-30 10:00:00'); // 10 AM EAT (daytime)
    $now = $offlineAt->copy()->addMinutes(15);
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_POST_OFFLINE_15MIN);

    $this->engine->processDueNotifications($now);
});

// 20. post_offline_1h fires 1 hour after daytime went_offline
it('fires post_offline_1h at 1 hour after daytime went_offline', function () {
    $offlineAt = Carbon::parse('2026-04-30 10:00:00');
    $now = $offlineAt->copy()->addHour();
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_POST_OFFLINE_1H);

    $this->engine->processDueNotifications($now);
});

// 21. post_offline_3h fires 3 hours after daytime session_expired
it('fires post_offline_3h at 3 hours after daytime session_expired', function () {
    $offlineAt = Carbon::parse('2026-04-30 10:00:00');
    $now = $offlineAt->copy()->addHours(3);
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_SESSION_EXPIRED);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_POST_OFFLINE_3H);

    $this->engine->processDueNotifications($now);
});

// 22. post_offline_6h fires 6 hours after daytime went_offline
it('fires post_offline_6h at 6 hours after daytime went_offline', function () {
    $offlineAt = Carbon::parse('2026-04-30 08:00:00');
    $now = $offlineAt->copy()->addHours(6);
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_POST_OFFLINE_6H);

    $this->engine->processDueNotifications($now);
});

// 23. post_offline_12h fires 12 hours after daytime went_offline
it('fires post_offline_12h at 12 hours after daytime went_offline', function () {
    $offlineAt = Carbon::parse('2026-04-30 08:00:00');
    $now = $offlineAt->copy()->addHours(12);
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_POST_OFFLINE_12H);

    $this->engine->processDueNotifications($now);
});

// 24. sleep_post_offline_15 fires 15 min after nighttime session_expired
it('fires sleep_post_offline_15 at 15 min after nighttime session_expired', function () {
    $offlineAt = Carbon::parse('2026-04-30 23:30:00'); // 11:30 PM EAT (nighttime)
    $now = $offlineAt->copy()->addMinutes(15);
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_SESSION_EXPIRED);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(fn ($agent, $type) => $type === NotificationLog::TYPE_SLEEP_POST_OFFLINE_15);

    $this->engine->processDueNotifications($now);
});

// 25. Nighttime session_expired does NOT fire post_offline_1h (silence after 15min)
it('does not fire post_offline_1h after nighttime session_expired', function () {
    $offlineAt = Carbon::parse('2026-04-30 23:30:00');
    $now = $offlineAt->copy()->addHour(); // 00:30 EAT next day — still nighttime
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_SESSION_EXPIRED);

    $this->mockDispatcher->shouldNotReceive('dispatchAndLog');

    $this->engine->processDueNotifications($now);
});

// 26. Nighttime went_offline fires ZERO reminders (total silence)
it('fires zero reminders after nighttime went_offline', function () {
    $offlineAt = Carbon::parse('2026-04-30 23:30:00');
    $now = $offlineAt->copy()->addMinutes(15);
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $this->mockDispatcher->shouldNotReceive('dispatchAndLog');

    $this->engine->processDueNotifications($now);
});

// 27. Outside tolerance window — no fire
it('does not fire post_offline when outside tolerance window', function () {
    $offlineAt = Carbon::parse('2026-04-30 10:00:00');
    $now = $offlineAt->copy()->addMinutes(14); // 14 min — too early for 15
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $this->mockDispatcher->shouldNotReceive('dispatchAndLog');

    $this->engine->processDueNotifications($now);
});

// 28. 7 AM chain reset: offline since yesterday, 7:15 AM today fires post_offline_15min
it('fires post_offline_15min anchored to 7am for yesterday offline', function () {
    $offlineAt = Carbon::parse('2026-04-29 18:00:00'); // yesterday 6 PM
    $now = Carbon::parse('2026-04-30 07:15:00'); // today 7:15 AM
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $todaysSevenAm = Carbon::parse('2026-04-30 07:00:00');

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload, $refTimestamp) use ($todaysSevenAm) {
            return $type === NotificationLog::TYPE_POST_OFFLINE_15MIN
                && $refTimestamp->equalTo($todaysSevenAm);
        });

    $this->engine->processDueNotifications($now);
});

// 29. 7 AM chain reset: offline since yesterday, 8:00 AM today fires post_offline_1h
it('fires post_offline_1h anchored to 7am for yesterday offline', function () {
    $offlineAt = Carbon::parse('2026-04-29 18:00:00');
    $now = Carbon::parse('2026-04-30 08:00:00');
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $todaysSevenAm = Carbon::parse('2026-04-30 07:00:00');

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload, $refTimestamp) use ($todaysSevenAm) {
            return $type === NotificationLog::TYPE_POST_OFFLINE_1H
                && $refTimestamp->equalTo($todaysSevenAm);
        });

    $this->engine->processDueNotifications($now);
});

// 30. Agent offline today at 8 AM → anchor is 8 AM (after 7 AM, uses actual event)
it('uses actual offline event time when after 7am today', function () {
    $offlineAt = Carbon::parse('2026-04-30 08:00:00');
    $now = $offlineAt->copy()->addMinutes(15);
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload, $refTimestamp) use ($offlineAt) {
            return $type === NotificationLog::TYPE_POST_OFFLINE_15MIN
                && $refTimestamp->equalTo($offlineAt);
        });

    $this->engine->processDueNotifications($now);
});

// 31. Agent came back online after offline → no reminders
it('does not fire reminders after agent came back online', function () {
    $offlineAt = Carbon::parse('2026-04-30 10:00:00');
    $now = $offlineAt->copy()->addMinutes(15);
    Carbon::setTestNow($now);

    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    // Agent came back online after going offline
    StatusEvent::create([
        'agent_id' => $this->agent->id,
        'event_type' => StatusEvent::EVENT_WENT_ONLINE,
        'duration_minutes' => 60,
        'created_at' => $offlineAt->copy()->addMinutes(5),
    ]);
    $this->agent->update(['live_until' => $now->copy()->addHour()]);

    $this->mockDispatcher->shouldNotReceive('dispatchAndLog');

    $this->engine->processDueNotifications($now);
});

// 32. Multi-day chain reset: consecutive days get separate dispatches
it('fires separate dispatches on consecutive days with different anchors', function () {
    $offlineAt = Carbon::parse('2026-04-27 18:00:00'); // 3 days ago

    // Day 1: 8 AM today
    $day1 = Carbon::parse('2026-04-30 08:00:00');
    Carbon::setTestNow($day1);
    makeAgentOffline($this->agent, $offlineAt, StatusEvent::EVENT_WENT_OFFLINE);

    $anchor1 = Carbon::parse('2026-04-30 07:00:00');

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload, $refTimestamp) use ($anchor1) {
            return $type === NotificationLog::TYPE_POST_OFFLINE_1H
                && $refTimestamp->equalTo($anchor1);
        });

    $this->engine->processDueNotifications($day1);

    // Day 2: 8 AM tomorrow
    Mockery::close();
    $this->mockDispatcher = Mockery::mock(NotificationDispatcher::class);
    $this->engine = new NotificationRuleEngine($this->mockDispatcher);

    $day2 = Carbon::parse('2026-05-01 08:00:00');
    Carbon::setTestNow($day2);

    $anchor2 = Carbon::parse('2026-05-01 07:00:00');

    $this->mockDispatcher->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload, $refTimestamp) use ($anchor2) {
            return $type === NotificationLog::TYPE_POST_OFFLINE_1H
                && $refTimestamp->equalTo($anchor2);
        });

    $this->engine->processDueNotifications($day2);
});
