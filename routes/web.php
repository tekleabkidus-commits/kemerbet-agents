<?php

use App\Http\Controllers\Agent\AgentSecretController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Agent secret page — token validated server-side
Route::get('/a/{token}', [AgentSecretController::class, 'page'])
    ->where('token', '[a-f0-9]{64}');

Route::get('/admin/{any?}', function () {
    return view('admin');
})->where('any', '.*');
