<?php

namespace App\Providers;

use App\Services\NotificationDispatcher;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Without an explicit binding the container would autowire the
        // dispatcher's optional WebPush parameter, building the VAPID
        // client on every resolve. Let the dispatcher create it lazily.
        $this->app->bind(NotificationDispatcher::class, fn () => new NotificationDispatcher);
    }

    public function boot(): void
    {
        RateLimiter::for('admin-login', function (Request $request) {
            return Limit::perMinutes(15, 5)->by($request->ip());
        });

        RateLimiter::for('agent-actions', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        RateLimiter::for('public-api', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        RateLimiter::for('public-clicks', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        RateLimiter::for('public-visits', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });
    }
}
