<?php

it('renders branded 404 page for unknown public route', function () {
    $response = $this->get('/this-route-does-not-exist');
    $response->assertStatus(404);
    $response->assertSee('Wrong page');
    $response->assertSee('Go to Kemerbet');
    $response->assertSee('@KemerbetSupport');
    $response->assertSee('https://kemerbet.com');
    $response->assertSee('https://t.me/KemerbetSupport');
});

it('returns JSON 404 for unknown api route', function () {
    $response = $this->getJson('/api/this-does-not-exist');
    $response->assertStatus(404);
    expect($response->headers->get('content-type'))->toContain('application/json');
});

it('does not show 404 for admin SPA routes', function () {
    $response = $this->get('/admin/random-page');
    $response->assertStatus(200);
});
