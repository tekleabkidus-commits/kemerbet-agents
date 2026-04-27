<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ListAgentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', 'string', 'in:all,live,offline,disabled,deleted'],
            'payment_method' => ['sometimes', 'string', 'max:50'],
            'sort' => ['sometimes', 'string', 'in:number,last_seen'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
