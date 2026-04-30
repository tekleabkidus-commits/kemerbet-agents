<?php

use Illuminate\Support\Facades\Config;

it('reads VAPID public key from config', function () {
    config(['services.webpush.public_key' => 'test-public-key']);

    expect(config('services.webpush.public_key'))->toBe('test-public-key');
});

it('reads VAPID private key from config', function () {
    config(['services.webpush.private_key' => 'test-private-key']);

    expect(config('services.webpush.private_key'))->toBe('test-private-key');
});

it('defaults VAPID subject to mailto:admin@kemerbet.com', function () {
    config(['services.webpush.subject' => null]);

    // Re-evaluate the default by reading the config file definition
    $services = require base_path('config/services.php');

    expect($services['webpush']['subject'])->toBe('mailto:admin@kemerbet.com');
});
