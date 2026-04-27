<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAgentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'telegram_username' => [
                'sometimes',
                'string',
                'min:3',
                'max:32',
                'regex:/^[A-Za-z0-9_]+$/',
            ],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            // min:1 ensures the public agent block always shows at least one
            // payment method tag — agents with zero methods would render with
            // empty bank-tags row.
            'payment_method_ids' => ['sometimes', 'array', 'min:1'],
            'payment_method_ids.*' => ['integer', 'exists:payment_methods,id'],
        ];
    }
}
