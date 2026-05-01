<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CreatePaymentMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'display_name' => ['required', 'string', 'max:100', 'unique:payment_methods,display_name'],
            'slug' => ['required', 'string', 'max:50', 'unique:payment_methods,slug', 'regex:/^[a-z0-9_]+$/'],
            'icon_url' => ['nullable', 'string', 'max:500', 'url'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
