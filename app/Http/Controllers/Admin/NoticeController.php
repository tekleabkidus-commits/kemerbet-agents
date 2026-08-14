<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateNoticeRequest;
use App\Http\Requests\Admin\UpdateNoticeRequest;
use App\Models\Agent;
use App\Models\Notice;
use App\Models\NotificationLog;
use App\Services\NotificationDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NoticeController extends Controller
{
    public function __construct(
        private readonly NotificationDispatcher $dispatcher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->input('per_page', 25), 100);

        $paginator = Notice::orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(CreateNoticeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $notice = Notice::create([
            'title' => $validated['title'] ?? null,
            'body' => $validated['body'],
            'priority' => $validated['priority'] ?? Notice::PRIORITY_INFO,
            'is_active' => $validated['is_active'] ?? true,
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
            'send_push' => $validated['send_push'] ?? false,
            'created_by' => $request->user()->id,
        ]);

        if ($notice->send_push && $notice->isCurrentlyVisible()) {
            $this->pushToSubscribedAgents($notice);
        }

        return response()->json(['data' => $notice], 201);
    }

    public function update(UpdateNoticeRequest $request, Notice $notice): JsonResponse
    {
        $notice->update($request->validated());

        return response()->json(['data' => $notice->fresh()]);
    }

    public function toggle(Notice $notice): JsonResponse
    {
        $notice->update(['is_active' => ! $notice->is_active]);

        return response()->json(['data' => $notice->fresh()]);
    }

    public function destroy(Notice $notice): JsonResponse
    {
        $notice->delete();

        return response()->json(null, 204);
    }

    /**
     * Web-push the notice to every active agent that has an active
     * push subscription. Delivery + notification_log handled by the
     * dispatcher (same pattern as agents:wakeup).
     */
    private function pushToSubscribedAgents(Notice $notice): void
    {
        $agents = Agent::where('status', Agent::STATUS_ACTIVE)
            ->whereHas('pushSubscriptions', fn ($query) => $query->active())
            ->get();

        foreach ($agents as $agent) {
            $token = $agent->activeToken?->token ?? 'unknown';

            $this->dispatcher->dispatchAndLog(
                $agent,
                NotificationLog::TYPE_ADMIN_NOTICE,
                [
                    'title' => 'Notice from Kemerbet',
                    'body' => Str::limit($notice->body, 120),
                    'url' => "/a/{$token}",
                ],
                $notice->created_at,
            );
        }
    }
}
