<?php

use App\Http\Controllers\Admin\AgentController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\PaymentMethodController;
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

        Route::get('agents', [AgentController::class, 'index']);
        Route::post('agents', [AgentController::class, 'store']);
        Route::get('agents/{agent}', [AgentController::class, 'show']);
        Route::put('agents/{agent}', [AgentController::class, 'update']);
        Route::post('agents/{agent}/disable', [AgentController::class, 'disable']);
        Route::post('agents/{agent}/enable', [AgentController::class, 'enable']);
        Route::post('agents/{agent}/regenerate-token', [AgentController::class, 'regenerateToken']);
        Route::delete('agents/{agent}', [AgentController::class, 'destroy']);
    });
});
