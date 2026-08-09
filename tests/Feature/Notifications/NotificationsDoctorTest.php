<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('runs successfully when VAPID config is present', function () {
    config([
        'services.webpush.public_key' => 'test-public-key',
        'services.webpush.private_key' => 'test-private-key',
    ]);

    $this->artisan('notifications:doctor')
        ->expectsOutputToContain('VAPID public key: set')
        ->expectsOutputToContain('VAPID private key: set')
        ->expectsOutputToContain('active agents have push subscriptions')
        ->expectsOutputToContain('no notifications ever sent')
        ->expectsOutputToContain('0 notifications sent in the last 24 hours')
        ->assertExitCode(0);
});

it('reports missing keys and exits 1 when VAPID config is absent', function () {
    config([
        'services.webpush.public_key' => null,
        'services.webpush.private_key' => null,
    ]);

    $this->artisan('notifications:doctor')
        ->expectsOutputToContain('VAPID public key: MISSING')
        ->expectsOutputToContain('VAPID private key: MISSING')
        ->assertExitCode(1);
});
