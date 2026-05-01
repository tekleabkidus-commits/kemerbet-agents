<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreatePaymentMethodRequest;
use App\Http\Requests\Admin\ReorderPaymentMethodsRequest;
use App\Http\Requests\Admin\UpdatePaymentMethodRequest;
use App\Models\PaymentMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentMethodController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PaymentMethod::withCount('agents')
            ->orderBy('display_order');

        if (! $request->boolean('include_inactive')) {
            $query->where('is_active', true);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(CreatePaymentMethodRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! isset($validated['display_order'])) {
            $validated['display_order'] = (PaymentMethod::max('display_order') ?? 0) + 10;
        }

        if (! isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $method = PaymentMethod::create($validated);

        return response()->json([
            'data' => $method->loadCount('agents'),
        ], 201);
    }

    public function update(UpdatePaymentMethodRequest $request, PaymentMethod $paymentMethod): JsonResponse
    {
        $paymentMethod->update($request->validated());

        return response()->json([
            'data' => $paymentMethod->fresh()->loadCount('agents'),
        ]);
    }

    public function destroy(PaymentMethod $paymentMethod): JsonResponse
    {
        $agentCount = $paymentMethod->agents()->count();

        if ($agentCount > 0) {
            return response()->json([
                'message' => "Cannot delete payment method: it is linked to {$agentCount} agent(s). Deactivate it instead.",
            ], 422);
        }

        $paymentMethod->delete();

        return response()->json(null, 204);
    }

    public function reorder(ReorderPaymentMethodsRequest $request): JsonResponse
    {
        $ids = $request->validated()['ids'];

        DB::transaction(function () use ($ids) {
            foreach ($ids as $position => $id) {
                PaymentMethod::where('id', $id)->update(['display_order' => $position * 10]);
            }
        });

        $methods = PaymentMethod::withCount('agents')
            ->orderBy('display_order')
            ->get();

        return response()->json(['data' => $methods]);
    }
}
