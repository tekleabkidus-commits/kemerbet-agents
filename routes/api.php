<?php

use App\Http\Controllers\Admin\ActivityController;
use App\Http\Controllers\Admin\AgentController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\PaymentMethodController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\StatsController;
use App\Http\Controllers\Agent\AgentSecretController;
use App\Http\Controllers\Public\PublicAgentsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin Auth
|--------------------------------------------------------------------------
*/

Route::prefix('admin')->group(function () {
    Route::post('login', [AuthController::class, 'login'])
        ->middleware('throttle:admin-login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);

        Route::get('payment-methods', [PaymentMethodController::class, 'index']);
        Route::post('payment-methods', [PaymentMethodController::class, 'store']);
        Route::put('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update']);
        Route::delete('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy']);
        Route::post('payment-methods/reorder', [PaymentMethodController::class, 'reorder']);
        Route::get('settings', [SettingController::class, 'index']);
        Route::patch('settings', [SettingController::class, 'update']);
        Route::get('activity', [ActivityController::class, 'index']);

        Route::get('agents', [AgentController::class, 'index']);
        Route::post('agents', [AgentController::class, 'store']);
        Route::get('agents/{agent}', [AgentController::class, 'show']);
        Route::put('agents/{agent}', [AgentController::class, 'update']);
        Route::post('agents/{agent}/disable', [AgentController::class, 'disable']);
        Route::post('agents/{agent}/enable', [AgentController::class, 'enable']);
        Route::post('agents/{agent}/regenerate-token', [AgentController::class, 'regenerateToken']);
        Route::delete('agents/{agent}', [AgentController::class, 'destroy']);
        Route::post('agents/{agent}/restore', [AgentController::class, 'restore'])->withTrashed();

        Route::get('stats/overview', [StatsController::class, 'overview']);
        Route::get('stats/timeline', [StatsController::class, 'timeline']);
        Route::get('stats/leaderboard', [StatsController::class, 'leaderboard']);
        Route::get('stats/heatmap', [StatsController::class, 'heatmap']);
        Route::get('stats/payment-methods', [StatsController::class, 'paymentMethods']);
        Route::get('stats/agent/{agent}', [StatsController::class, 'agentDetail']);
    });
});

/*
|--------------------------------------------------------------------------
| Agent Secret Page API
|--------------------------------------------------------------------------
| Token-in-URL authentication. No Sanctum. Rate-limited.
*/

/*
|--------------------------------------------------------------------------
| Public API (no auth, rate-limited, CSRF-exempt)
|--------------------------------------------------------------------------
*/

Route::prefix('public')->group(function () {
    Route::get('agents', [PublicAgentsController::class, 'index'])
        ->middleware('throttle:public-api');
    Route::post('agents/{agent}/click', [PublicAgentsController::class, 'click'])
        ->where('agent', '[0-9]+')
        ->middleware('throttle:public-clicks');
    Route::post('visit', [PublicAgentsController::class, 'visit'])
        ->middleware('throttle:public-visits');
});

Route::prefix('agent/{token}')
    ->where(['token' => '[a-f0-9]{64}'])
    ->middleware('throttle:agent-actions')
    ->group(function () {
        Route::get('state', [AgentSecretController::class, 'state']);
        Route::post('go-online', [AgentSecretController::class, 'goOnline']);
        Route::post('extend', [AgentSecretController::class, 'extend']);
        Route::post('go-offline', [AgentSecretController::class, 'goOffline']);
        Route::post('subscribe', [AgentSecretController::class, 'subscribe']);
        Route::delete('subscribe', [AgentSecretController::class, 'unsubscribe']);
    });
