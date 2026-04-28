<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListActivityRequest;
use App\Models\StatusEvent;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    public function index(ListActivityRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $query = StatusEvent::with([
            'agent' => fn ($q) => $q->withTrashed()->select('id', 'display_number', 'telegram_username', 'status', 'deleted_at'),
            'admin' => fn ($q) => $q->select('id', 'name', 'email'),
        ]);

        $eventTypes = $validated['event_type'] ?? null;
        if ($eventTypes !== null && $eventTypes !== []) {
            $query->whereIn('event_type', $eventTypes);
        }

        $adminId = $validated['admin_id'] ?? null;
        if ($adminId !== null) {
            $query->where('admin_id', $adminId);
        }

        $agentId = $validated['agent_id'] ?? null;
        if ($agentId !== null) {
            $query->where('agent_id', $agentId);
        }

        $dateFrom = $validated['date_from'] ?? null;
        if ($dateFrom !== null) {
            $query->where('created_at', '>=', $dateFrom);
        }

        $dateTo = $validated['date_to'] ?? null;
        if ($dateTo !== null) {
            $query->where('created_at', '<=', $dateTo.' 23:59:59');
        }

        $sort = $validated['sort'] ?? 'newest';
        $query->orderBy('created_at', $sort === 'oldest' ? 'asc' : 'desc');

        $perPage = $validated['per_page'] ?? 50;
        $paginator = $query->paginate($perPage);

        $data = $paginator->getCollection()->map(fn (StatusEvent $e) => [
            'id' => $e->id,
            'agent_id' => $e->agent_id,
            'agent' => $e->agent ? [
                'id' => $e->agent->id,
                'display_number' => $e->agent->display_number,
                'telegram_username' => $e->agent->telegram_username,
                'status' => $e->agent->status,
                'deleted_at' => $e->agent->deleted_at?->toIso8601String(),
            ] : null,
            'admin_id' => $e->admin_id,
            'admin' => $e->admin ? [
                'id' => $e->admin->id,
                'name' => $e->admin->name,
                'email' => $e->admin->email,
            ] : null,
            'event_type' => $e->event_type,
            'duration_minutes' => $e->duration_minutes,
            'ip_address' => $e->ip_address,
            'created_at' => $e->created_at->toIso8601String(),
        ]);

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
