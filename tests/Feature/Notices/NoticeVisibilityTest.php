<?php

use App\Models\Admin;
use App\Models\Notice;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::create([
        'email' => 'kidus@kemerbet.com',
        'password' => 'secret-password',
        'name' => 'Kidus',
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
});

function visibilityNotice(Admin $admin, array $overrides = []): Notice
{
    return Notice::create(array_merge([
        'body' => 'A notice body',
        'created_by' => $admin->id,
    ], $overrides));
}

// 1. Active notice with no window is visible
test('active notice with no schedule window is visible', function () {
    $notice = visibilityNotice($this->admin);

    expect(Notice::currentlyVisible()->pluck('id')->all())->toBe([$notice->id]);
    expect($notice->status)->toBe(Notice::STATUS_ACTIVE);
});

// 2. Scheduled future notice is hidden
test('notice scheduled in the future is hidden', function () {
    $notice = visibilityNotice($this->admin, ['starts_at' => now()->addHour()]);

    expect(Notice::currentlyVisible()->count())->toBe(0);
    expect($notice->status)->toBe(Notice::STATUS_SCHEDULED);
});

// 3. Expired notice is hidden
test('notice past its ends_at is hidden', function () {
    $notice = visibilityNotice($this->admin, [
        'starts_at' => now()->subDay(),
        'ends_at' => now()->subHour(),
    ]);

    expect(Notice::currentlyVisible()->count())->toBe(0);
    expect($notice->status)->toBe(Notice::STATUS_EXPIRED);
});

// 4. Inactive notice is hidden
test('inactive notice is hidden', function () {
    $notice = visibilityNotice($this->admin, ['is_active' => false]);

    expect(Notice::currentlyVisible()->count())->toBe(0);
    expect($notice->status)->toBe(Notice::STATUS_OFF);
});

// 5. Notice inside its window is visible
test('notice inside its schedule window is visible', function () {
    $notice = visibilityNotice($this->admin, [
        'starts_at' => now()->subHour(),
        'ends_at' => now()->addHour(),
    ]);

    expect(Notice::currentlyVisible()->pluck('id')->all())->toBe([$notice->id]);
});

// 6. Becomes visible once starts_at passes, hidden once ends_at passes
test('windowing follows the clock', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-14 10:00:00'));

    visibilityNotice($this->admin, [
        'starts_at' => Carbon::parse('2026-08-14 12:00:00'),
        'ends_at' => Carbon::parse('2026-08-14 14:00:00'),
    ]);

    expect(Notice::currentlyVisible()->count())->toBe(0);

    Carbon::setTestNow(Carbon::parse('2026-08-14 12:30:00'));
    expect(Notice::currentlyVisible()->count())->toBe(1);

    Carbon::setTestNow(Carbon::parse('2026-08-14 14:00:00'));
    expect(Notice::currentlyVisible()->count())->toBe(0);
});

// 7. Ordering: urgent first, then newest first
test('currentlyVisible orders urgent first then newest', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-14 10:00:00'));
    $oldInfo = visibilityNotice($this->admin, ['body' => 'old info']);

    Carbon::setTestNow(Carbon::parse('2026-08-14 11:00:00'));
    $newInfo = visibilityNotice($this->admin, ['body' => 'new info']);

    Carbon::setTestNow(Carbon::parse('2026-08-14 09:00:00'));
    $urgent = visibilityNotice($this->admin, ['body' => 'urgent', 'priority' => 'urgent']);

    Carbon::setTestNow(Carbon::parse('2026-08-14 12:00:00'));

    expect(Notice::currentlyVisible()->pluck('id')->all())
        ->toBe([$urgent->id, $newInfo->id, $oldInfo->id]);
});

// 8. Soft-deleted notices are excluded
test('soft deleted notices are not visible', function () {
    $notice = visibilityNotice($this->admin);
    $notice->delete();

    expect(Notice::currentlyVisible()->count())->toBe(0);
});
