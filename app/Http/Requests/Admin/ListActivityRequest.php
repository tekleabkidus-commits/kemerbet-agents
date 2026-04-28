<?php

namespace App\Http\Requests\Admin;

use App\Models\StatusEvent;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event_type' => ['sometimes', 'array'],
            'event_type.*' => ['string', Rule::in(StatusEvent::EVENT_TYPES)],
            'admin_id' => ['sometimes', 'integer', 'exists:admins,id'],
            'agent_id' => ['sometimes', 'integer', Rule::exists('agents', 'id')],
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date', 'after_or_equal:date_from'],
            'sort' => ['sometimes', 'in:newest,oldest'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
