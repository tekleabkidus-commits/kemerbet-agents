<?php

use App\Models\Admin;
use App\Models\Agent;
use App\Models\Notice;
use App\Models\NotificationLog;
use App\Models\PushSubscription;
use App\Services\NotificationDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\WebPush;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\UriInterface;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
        'name' => 'Kidus',
    ]);

    $this->withHeaders(['Origin' => 'http://localhost:8001']);
});

function noticeAttributes(array $overrides = []): array
{
    return array_merge([
        'body' => 'Payout schedule changed for the weekend.',
    ], $overrides);
}

// 1. Create with defaults
test('admin can create a notice with defaults', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', noticeAttributes());

    $response->assertStatus(201);
    expect($response->json('data.body'))->toBe('Payout schedule changed for the weekend.');
    expect($response->json('data.priority'))->toBe('info');
    expect($response->json('data.is_active'))->toBeTrue();
    expect($response->json('data.status'))->toBe('active');

    $this->assertDatabaseHas('notices', [
        'body' => 'Payout schedule changed for the weekend.',
        'created_by' => $this->admin->id,
    ]);
});

// 2. Create with full fields
test('admin can create an urgent scheduled notice', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', noticeAttributes([
            'title' => 'Maintenance',
            'priority' => 'urgent',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addDays(2)->toDateTimeString(),
        ]));

    $response->assertStatus(201);
    expect($response->json('data.priority'))->toBe('urgent');
    expect($response->json('data.status'))->toBe('scheduled');
});

// 3. Validation: body required, max length, priority whitelist
test('create validation rejects missing body, long body, and bad priority', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['body']);

    $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', noticeAttributes(['body' => str_repeat('a', 1001)]))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['body']);

    $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', noticeAttributes(['priority' => 'loud']))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['priority']);
});

// 4. Validation: ends_at must be after starts_at when both present
test('create validation rejects ends_at before starts_at', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', noticeAttributes([
            'starts_at' => now()->addDays(2)->toDateTimeString(),
            'ends_at' => now()->addDay()->toDateTimeString(),
        ]))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['ends_at']);
});

// 5. Index lists all notices with computed status
test('index lists all notices including inactive and expired with status field', function () {
    $active = Notice::create(noticeAttributes(['body' => 'Active one', 'created_by' => $this->admin->id]));
    $scheduled = Notice::create(noticeAttributes([
        'body' => 'Scheduled one',
        'starts_at' => now()->addDay(),
        'created_by' => $this->admin->id,
    ]));
    $expired = Notice::create(noticeAttributes([
        'body' => 'Expired one',
        'ends_at' => now()->subHour(),
        'created_by' => $this->admin->id,
    ]));
    $off = Notice::create(noticeAttributes([
        'body' => 'Off one',
        'is_active' => false,
        'created_by' => $this->admin->id,
    ]));

    $response = $this->actingAs($this->admin)->getJson('/api/admin/notices');

    $response->assertOk();
    expect($response->json('meta.total'))->toBe(4);

    $statuses = collect($response->json('data'))->pluck('status', 'id');
    expect($statuses[$active->id])->toBe('active')
        ->and($statuses[$scheduled->id])->toBe('scheduled')
        ->and($statuses[$expired->id])->toBe('expired')
        ->and($statuses[$off->id])->toBe('off');
});

// 6. Update
test('admin can update a notice', function () {
    $notice = Notice::create(noticeAttributes(['created_by' => $this->admin->id]));

    $response = $this->actingAs($this->admin)
        ->putJson("/api/admin/notices/{$notice->id}", [
            'body' => 'Updated body',
            'priority' => 'urgent',
        ]);

    $response->assertOk();
    expect($response->json('data.body'))->toBe('Updated body');
    expect($response->json('data.priority'))->toBe('urgent');

    $this->assertDatabaseHas('notices', ['id' => $notice->id, 'body' => 'Updated body']);
});

// 7. Toggle flips is_active both ways
test('toggle flips is_active', function () {
    $notice = Notice::create(noticeAttributes(['created_by' => $this->admin->id]));

    $off = $this->actingAs($this->admin)->postJson("/api/admin/notices/{$notice->id}/toggle");
    $off->assertOk();
    expect($off->json('data.is_active'))->toBeFalse();
    expect($off->json('data.status'))->toBe('off');

    $on = $this->actingAs($this->admin)->postJson("/api/admin/notices/{$notice->id}/toggle");
    $on->assertOk();
    expect($on->json('data.is_active'))->toBeTrue();
});

// 8. Soft delete
test('admin can soft delete a notice', function () {
    $notice = Notice::create(noticeAttributes(['created_by' => $this->admin->id]));

    $this->actingAs($this->admin)
        ->deleteJson("/api/admin/notices/{$notice->id}")
        ->assertStatus(204);

    $this->assertSoftDeleted('notices', ['id' => $notice->id]);
});

// 9. Unauthenticated access rejected
test('unauthenticated user cannot access notice endpoints', function () {
    $notice = Notice::create(noticeAttributes(['created_by' => $this->admin->id]));

    $this->getJson('/api/admin/notices')->assertUnauthorized();
    $this->postJson('/api/admin/notices', noticeAttributes())->assertUnauthorized();
    $this->putJson("/api/admin/notices/{$notice->id}", noticeAttributes())->assertUnauthorized();
    $this->postJson("/api/admin/notices/{$notice->id}/toggle")->assertUnauthorized();
    $this->deleteJson("/api/admin/notices/{$notice->id}")->assertUnauthorized();
});

// =====================================================================
// Push dispatch on create
// =====================================================================

// 10. Push dispatched to subscribed active agents when send_push and visible
test('push is dispatched on create when send_push and notice is visible', function () {
    $subscribed = Agent::create(['display_number' => 1, 'telegram_username' => 'SUBBED', 'status' => 'active']);
    PushSubscription::factory()->for($subscribed)->create();

    $unsubscribed = Agent::create(['display_number' => 2, 'telegram_username' => 'NOSUB', 'status' => 'active']);

    $body = str_repeat('Long notice body. ', 20);

    $mock = $this->mock(NotificationDispatcher::class);
    $mock->expects('dispatchAndLog')
        ->once()
        ->withArgs(function ($agent, $type, $payload) use ($subscribed, $body) {
            return $agent->id === $subscribed->id
                && $type === NotificationLog::TYPE_ADMIN_NOTICE
                && $payload['title'] === 'Notice from Kemerbet'
                && $payload['body'] === Str::limit($body, 120);
        });

    $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', noticeAttributes([
            'body' => $body,
            'send_push' => true,
        ]))
        ->assertStatus(201);
});

// 11. No push when send_push is false
test('no push is dispatched when send_push is false', function () {
    $agent = Agent::create(['display_number' => 1, 'telegram_username' => 'SUBBED', 'status' => 'active']);
    PushSubscription::factory()->for($agent)->create();

    $mock = $this->mock(NotificationDispatcher::class);
    $mock->shouldNotReceive('dispatchAndLog');

    $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', noticeAttributes())
        ->assertStatus(201);
});

// 12. No push when notice is not currently visible (scheduled in the future)
test('no push is dispatched when notice is scheduled for the future', function () {
    $agent = Agent::create(['display_number' => 1, 'telegram_username' => 'SUBBED', 'status' => 'active']);
    PushSubscription::factory()->for($agent)->create();

    $mock = $this->mock(NotificationDispatcher::class);
    $mock->shouldNotReceive('dispatchAndLog');

    $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', noticeAttributes([
            'send_push' => true,
            'starts_at' => now()->addDay()->toDateTimeString(),
        ]))
        ->assertStatus(201);
});

// 13. Integration: real dispatcher writes notification_log with TYPE_ADMIN_NOTICE
test('push logs admin_notice in notification_log on successful delivery', function () {
    $agent = Agent::create(['display_number' => 1, 'telegram_username' => 'SUBBED', 'status' => 'active']);
    $sub = PushSubscription::factory()->for($agent)->create();

    $uri = Mockery::mock(UriInterface::class);
    $uri->allows('__toString')->andReturn($sub->endpoint);
    $request = Mockery::mock(RequestInterface::class);
    $request->allows('getUri')->andReturn($uri);
    $report = new MessageSentReport($request, null, true, 'OK');

    $webPush = Mockery::mock(WebPush::class);
    $webPush->expects('queueNotification')->once();
    $webPush->expects('flush')->andReturn((function () use ($report) {
        yield $report;
    })());

    $this->app->bind(NotificationDispatcher::class, fn () => new NotificationDispatcher($webPush));

    $this->actingAs($this->admin)
        ->postJson('/api/admin/notices', noticeAttributes(['send_push' => true]))
        ->assertStatus(201);

    $log = NotificationLog::where('agent_id', $agent->id)->sole();
    expect($log->notification_type)->toBe(NotificationLog::TYPE_ADMIN_NOTICE)
        ->and($log->payload['title'])->toBe('Notice from Kemerbet');
});
