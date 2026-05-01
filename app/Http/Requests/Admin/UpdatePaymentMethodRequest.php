<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePaymentMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $paymentMethod = $this->route('paymentMethod');

        return [
            'display_name' => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('payment_methods', 'display_name')
                    ->ignore($paymentMethod->id)
                    ->whereNull('deleted_at'),
            ],
            'slug' => [
                'sometimes',
                'string',
                'max:50',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('payment_methods', 'slug')
                    ->ignore($paymentMethod->id)
                    ->whereNull('deleted_at'),
            ],
            'icon_url' => ['sometimes', 'nullable', 'string', 'max:500', 'url'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
