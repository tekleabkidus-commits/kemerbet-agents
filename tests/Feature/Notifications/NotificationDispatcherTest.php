<?php

use App\Models\Agent;
use App\Models\NotificationLog;
use App\Models\PushSubscription;
use App\Services\NotificationDispatcher;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\WebPush;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\UriInterface;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->agent = Agent::create([
        'display_number' => 7,
        'telegram_username' => 'DISPATCHER',
        'status' => 'active',
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
    Mockery::close();
});

function testPayload(): array
{
    return ['title' => 'Players are waiting', 'body' => 'Come back online', 'url' => '/a/test-token'];
}

function makeReport(string $endpoint, bool $success, ?int $statusCode = null): MessageSentReport
{
    $uri = Mockery::mock(UriInterface::class);
    $uri->allows('__toString')->andReturn($endpoint);

    $request = Mockery::mock(RequestInterface::class);
    $request->allows('getUri')->andReturn($uri);

    $response = null;
    if ($statusCode !== null) {
        $response = Mockery::mock(ResponseInterface::class);
        $response->allows('getStatusCode')->andReturn($statusCode);
    }

    return new MessageSentReport($request, $response, $success, $success ? 'OK' : 'Error');
}

function reportsGenerator(array $reports): Generator
{
    foreach ($reports as $report) {
        yield $report;
    }
}

function makeMockWebPush(int $expectedQueues, array $reports): WebPush
{
    $mock = Mockery::mock(WebPush::class);
    $mock->expects('queueNotification')->times($expectedQueues);
    $mock->expects('flush')->andReturn(reportsGenerator($reports));

    return $mock;
}

// 1. Successful single subscription delivery
it('delivers to a single active subscription', function () {
    $sub = PushSubscription::factory()->for($this->agent)->create();

    $mock = makeMockWebPush(1, [
        makeReport($sub->endpoint, true, 201),
    ]);

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatch($this->agent, NotificationLog::TYPE_POST_OFFLINE_15MIN, testPayload());

    expect($count)->toBe(1);
    expect($sub->fresh()->last_used_at)->not->toBeNull();
});

// 2. Multiple subscriptions all succeed
it('delivers to all active subscriptions', function () {
    $subs = PushSubscription::factory()->count(3)->for($this->agent)->create();

    $reports = $subs->map(fn ($s) => makeReport($s->endpoint, true, 201))->all();
    $mock = makeMockWebPush(3, $reports);

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatch($this->agent, NotificationLog::TYPE_POST_OFFLINE_15MIN, testPayload());

    expect($count)->toBe(3);
});

// 3. 410 Gone marks subscription inactive with failed_at
it('marks subscription inactive on 410 Gone', function () {
    $sub = PushSubscription::factory()->for($this->agent)->create();

    $mock = makeMockWebPush(1, [
        makeReport($sub->endpoint, false, 410),
    ]);

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatch($this->agent, NotificationLog::TYPE_POST_OFFLINE_15MIN, testPayload());

    expect($count)->toBe(0);
    $sub->refresh();
    expect($sub->is_active)->toBeFalse()
        ->and($sub->failed_at)->not->toBeNull();
});

// 4. 404 marks subscription inactive
it('marks subscription inactive on 404', function () {
    $sub = PushSubscription::factory()->for($this->agent)->create();

    $mock = makeMockWebPush(1, [
        makeReport($sub->endpoint, false, 404),
    ]);

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatch($this->agent, NotificationLog::TYPE_POST_OFFLINE_15MIN, testPayload());

    expect($count)->toBe(0);
    expect($sub->fresh()->is_active)->toBeFalse();
});

// 5. 500 does NOT mark subscription inactive
it('leaves subscription active on 500 error', function () {
    $sub = PushSubscription::factory()->for($this->agent)->create();

    $mock = makeMockWebPush(1, [
        makeReport($sub->endpoint, false, 500),
    ]);

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatch($this->agent, NotificationLog::TYPE_POST_OFFLINE_15MIN, testPayload());

    expect($count)->toBe(0);
    $sub->refresh();
    expect($sub->is_active)->toBeTrue()
        ->and($sub->failed_at)->toBeNull();
});

// 6. Network error (null response) does NOT mark inactive
it('leaves subscription active on network error', function () {
    $sub = PushSubscription::factory()->for($this->agent)->create();

    $mock = makeMockWebPush(1, [
        makeReport($sub->endpoint, false),
    ]);

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatch($this->agent, NotificationLog::TYPE_POST_OFFLINE_15MIN, testPayload());

    expect($count)->toBe(0);
    $sub->refresh();
    expect($sub->is_active)->toBeTrue()
        ->and($sub->failed_at)->toBeNull();
});

// 7. Inactive subscriptions are skipped
it('skips inactive subscriptions', function () {
    PushSubscription::factory()->for($this->agent)->create(['is_active' => true]);
    PushSubscription::factory()->for($this->agent)->create(['is_active' => true]);
    PushSubscription::factory()->for($this->agent)->create(['is_active' => false]);

    $mock = Mockery::mock(WebPush::class);
    $mock->expects('queueNotification')->times(2);
    $mock->expects('flush')->andReturn(reportsGenerator([]));

    $dispatcher = new NotificationDispatcher($mock);
    $dispatcher->dispatch($this->agent, NotificationLog::TYPE_POST_OFFLINE_15MIN, testPayload());
});

// 8. dispatchAndLog writes log on success
it('writes notification log when dispatch succeeds', function () {
    $sub = PushSubscription::factory()->for($this->agent)->create();
    $ref = Carbon::parse('2026-04-30 12:00:00');

    $mock = makeMockWebPush(1, [
        makeReport($sub->endpoint, true, 201),
    ]);

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatchAndLog(
        $this->agent,
        NotificationLog::TYPE_POST_OFFLINE_15MIN,
        testPayload(),
        $ref,
    );

    expect($count)->toBe(1);

    $log = NotificationLog::where('agent_id', $this->agent->id)->sole();
    expect($log->notification_type)->toBe(NotificationLog::TYPE_POST_OFFLINE_15MIN)
        ->and($log->reference_timestamp->toDateTimeString())->toBe('2026-04-30 12:00:00')
        ->and($log->payload)->toEqual(testPayload());
});

// 9. dispatchAndLog skips log when zero deliveries (no active subs)
it('does not write log when no active subscriptions exist', function () {
    $ref = Carbon::parse('2026-04-30 12:00:00');

    $mock = Mockery::mock(WebPush::class);
    $mock->shouldNotReceive('queueNotification');
    $mock->shouldNotReceive('flush');

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatchAndLog(
        $this->agent,
        NotificationLog::TYPE_POST_OFFLINE_15MIN,
        testPayload(),
        $ref,
    );

    expect($count)->toBe(0);
    expect(NotificationLog::count())->toBe(0);
});

// 10. dispatchAndLog skips log when all deliveries fail
it('does not write log when all deliveries fail', function () {
    $sub = PushSubscription::factory()->for($this->agent)->create();
    $ref = Carbon::parse('2026-04-30 12:00:00');

    $mock = makeMockWebPush(1, [
        makeReport($sub->endpoint, false, 410),
    ]);

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatchAndLog(
        $this->agent,
        NotificationLog::TYPE_POST_OFFLINE_15MIN,
        testPayload(),
        $ref,
    );

    expect($count)->toBe(0);
    expect(NotificationLog::count())->toBe(0);
});

// 11. dispatchAndLog dedup: skips when already logged
it('skips dispatch entirely when notification already logged', function () {
    $ref = Carbon::parse('2026-04-30 12:00:00');

    NotificationLog::create([
        'agent_id' => $this->agent->id,
        'notification_type' => NotificationLog::TYPE_POST_OFFLINE_15MIN,
        'reference_timestamp' => $ref,
        'payload' => testPayload(),
    ]);

    PushSubscription::factory()->for($this->agent)->create();

    $mock = Mockery::mock(WebPush::class);
    $mock->shouldNotReceive('queueNotification');
    $mock->shouldNotReceive('flush');

    $dispatcher = new NotificationDispatcher($mock);
    $count = $dispatcher->dispatchAndLog(
        $this->agent,
        NotificationLog::TYPE_POST_OFFLINE_15MIN,
        testPayload(),
        $ref,
    );

    expect($count)->toBe(0);
    expect(NotificationLog::where('agent_id', $this->agent->id)->count())->toBe(1);
});
