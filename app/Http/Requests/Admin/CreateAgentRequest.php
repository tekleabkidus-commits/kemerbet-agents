<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CreateAgentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'telegram_username' => [
                'required',
                'string',
                'min:3',
                'max:32',
                'regex:/^[A-Za-z0-9_]+$/',
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
            'payment_method_ids' => ['required', 'array', 'min:1'],
            'payment_method_ids.*' => ['integer', 'exists:payment_methods,id'],
        ];
    }
}
