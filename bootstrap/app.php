<?php

use App\Http\Controllers\Public\EmbedScriptController;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Widget script. Outside the web group on purpose: no session or
            // cookies, so browsers and the edge can cache it (5 minutes).
            Route::get('/embed/embed.js', EmbedScriptController::class)->name('embed.script');
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();

        $middleware->validateCsrfTokens(except: [
            'api/agent/*',
            'api/public/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
