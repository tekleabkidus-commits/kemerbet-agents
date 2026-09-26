<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves the widget script at /embed/embed.js.
 *
 * It used to be a static file in public/, which phones and the CDN could keep
 * for hours — so after a deploy some players kept running an OLD widget.
 * Served from here it carries a short lifetime (5 minutes) plus an ETag: every
 * phone picks up a new version within minutes, and repeat loads stay cheap
 * (answered by the edge cache, or a tiny 304 "not modified").
 *
 * Registered outside the "web" middleware group (see bootstrap/app.php): no
 * session and no cookies, so the edge network is allowed to cache it.
 */
class EmbedScriptController extends Controller
{
    public const MAX_AGE_SECONDS = 300;

    public function __invoke(Request $request): Response
    {
        $path = resource_path('embed-dist/embed.js');
        abort_unless(is_file($path), 404);

        $body = (string) file_get_contents($path);

        $response = response($body, 200, [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Cache-Control' => 'public, max-age='.self::MAX_AGE_SECONDS.', s-maxage='.self::MAX_AGE_SECONDS,
        ]);
        $response->setEtag(sha1($body));

        // Same version the browser already has → 304 with no body.
        $response->isNotModified($request);

        return $response;
    }
}
