<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNoticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:150'],
            'body' => ['sometimes', 'required', 'string', 'max:1000'],
            'priority' => ['nullable', 'string', 'in:urgent,info'],
            'audience' => ['nullable', 'string', 'in:agent,player,both'],
            'video_url' => ['nullable', 'string', 'max:500', 'regex:/^$|^https?:\\/\\/(www\\.)?(youtube\\.com\\/(watch\\?v=|embed\\/)|youtu\\.be\\/)[\\w\\-_]+/i'],
            'is_active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => $this->filled('starts_at')
                ? ['nullable', 'date', 'after:starts_at']
                : ['nullable', 'date'],
        ];
    }
}
