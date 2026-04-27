<?php

use App\Http\Controllers\Admin\AgentController;
use App\Http\Controllers\Admin\AuthController;
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

        Route::get('agents', [AgentController::class, 'index']);
    });
});
