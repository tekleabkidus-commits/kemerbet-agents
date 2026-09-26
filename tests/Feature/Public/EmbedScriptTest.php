<?php

// /embed/embed.js is served by EmbedScriptController (not a static file) so
// new widget versions reach players' phones within minutes of a deploy.

it('serves the widget script with a short cache lifetime and an ETag', function () {
    $res = $this->get('/embed/embed.js');

    $res->assertOk();
    expect($res->headers->get('Content-Type'))->toContain('javascript');
    expect($res->headers->get('Cache-Control'))
        ->toContain('public')
        ->toContain('max-age=300')
        ->toContain('s-maxage=300');
    expect($res->headers->get('ETag'))->not->toBeNull();
    expect($res->getContent())->toBe(file_get_contents(resource_path('embed-dist/embed.js')));
});

it('sets no cookies, so the edge network may cache it', function () {
    $res = $this->get('/embed/embed.js');

    expect($res->headers->getCookies())->toBe([]);
    expect($res->headers->get('Set-Cookie'))->toBeNull();
});

it('answers 304 with no body when the phone already has this version', function () {
    $etag = $this->get('/embed/embed.js')->headers->get('ETag');

    $res = $this->get('/embed/embed.js', ['If-None-Match' => $etag]);

    $res->assertStatus(304);
    expect($res->getContent())->toBe('');
});

it('sends the full script when the phone has an older version', function () {
    $this->get('/embed/embed.js', ['If-None-Match' => '"an-older-version"'])
        ->assertOk()
        ->assertHeader('ETag');
});

it('keeps the built widget out of public/, where it would be cached for hours', function () {
    expect(file_exists(public_path('embed/embed.js')))->toBeFalse();
    expect(file_exists(resource_path('embed-dist/embed.js')))->toBeTrue();
});
