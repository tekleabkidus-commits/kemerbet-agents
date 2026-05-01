<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    private const KNOWN_KEYS = [
        'prefill_message',
        'agent_hide_after_hours',
        'public_refresh_interval_seconds',
        'show_offline_agents',
        'warn_on_offline_click',
        'shuffle_live_agents',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prefill_message' => ['sometimes', 'string', 'max:200'],
            'agent_hide_after_hours' => ['sometimes', 'integer', 'min:1', 'max:168'],
            'public_refresh_interval_seconds' => ['sometimes', 'integer', 'min:10', 'max:3600'],
            'show_offline_agents' => ['sometimes', 'boolean'],
            'warn_on_offline_click' => ['sometimes', 'boolean'],
            'shuffle_live_agents' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $unknownKeys = array_diff(array_keys($this->all()), self::KNOWN_KEYS);
            foreach ($unknownKeys as $key) {
                $validator->errors()->add($key, "Unknown setting key: {$key}");
            }
        });
    }
}
