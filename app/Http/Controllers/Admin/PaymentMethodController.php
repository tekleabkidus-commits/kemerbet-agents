<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\JsonResponse;

class PaymentMethodController extends Controller
{
    public function index(): JsonResponse
    {
        $methods = PaymentMethod::where('is_active', true)
            ->orderBy('display_order')
            ->get(['id', 'slug', 'display_name']);

        return response()->json(['data' => $methods]);
    }
}
