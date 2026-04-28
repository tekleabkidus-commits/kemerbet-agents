<?php

use App\Http\Controllers\Admin\ActivityController;
use App\Http\Controllers\Admin\AgentController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\PaymentMethodController;
use App\Http\Controllers\Agent\AgentSecretController;
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
    });
});

/*
|--------------------------------------------------------------------------
| Agent Secret Page API
|--------------------------------------------------------------------------
| Token-in-URL authentication. No Sanctum. Rate-limited.
*/

Route::prefix('agent/{token}')
    ->where(['token' => '[a-f0-9]{64}'])
    ->middleware('throttle:agent-actions')
    ->group(function () {
        Route::get('state', [AgentSecretController::class, 'state']);
        Route::post('go-online', [AgentSecretController::class, 'goOnline']);
        Route::post('extend', [AgentSecretController::class, 'extend']);
        Route::post('go-offline', [AgentSecretController::class, 'goOffline']);
    });
