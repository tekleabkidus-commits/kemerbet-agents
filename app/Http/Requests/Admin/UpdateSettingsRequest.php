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
        'normal_list_limit_enabled',
        'normal_list_limit',
        'onboarding_video_url',
        // --- Withdrawal system ---
        'withdrawals_enabled',
        'withdrawal_min',
        'withdrawal_max_default',
        'withdrawal_quick_amounts',
        'withdrawal_redirect_path',
        'withdrawal_howto_video_url',
        'deposit_howto_video_url',
        'withdrawal_no_match_behavior',
        'withdrawal_bank_options',
        'withdrawal_require_payout_details',
        'withdrawal_message_with_amount',
        'withdrawal_message_no_amount',
        'deposit_prefill_message',
        'deposit_quick_amounts',
        'deposit_message',
        'player_id_storage_key',
        'player_id_dom_selector',
        'recents_enabled',
        'recents_count',
        // --- Pair rule ---
        'pair_mode_enabled',
        'pair_size',
        'pair_reset_enabled',
        'pair_reset_hours',
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
            'normal_list_limit_enabled' => ['sometimes', 'boolean'],
            'normal_list_limit' => ['sometimes', 'integer', 'min:1', 'max:30'],
            'onboarding_video_url' => [
                'sometimes',
                'nullable',
                'string',
                'max:500',
                'regex:/^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+|^https?:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$|^https?:\/\/(iframe|player)\.mediadelivery\.net\/\S+$/i',
            ],

            // --- Withdrawal system ---
            'withdrawals_enabled' => ['sometimes', 'boolean'],
            'withdrawal_min' => ['sometimes', 'integer', 'min:1', 'max:10000000'],
            'withdrawal_max_default' => ['sometimes', 'integer', 'min:1', 'max:10000000'],
            'withdrawal_quick_amounts' => ['sometimes', 'array', 'max:12'],
            'withdrawal_quick_amounts.*' => ['integer', 'min:1'],
            'withdrawal_redirect_path' => ['sometimes', 'string', 'max:300'],
            'withdrawal_howto_video_url' => [
                'sometimes',
                'nullable',
                'string',
                'max:500',
                'regex:/^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+|^https?:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$|^https?:\/\/(iframe|player)\.mediadelivery\.net\/\S+$/i',
            ],
            'deposit_howto_video_url' => [
                'sometimes',
                'nullable',
                'string',
                'max:500',
                'regex:/^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+|^https?:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$|^https?:\/\/(iframe|player)\.mediadelivery\.net\/\S+$/i',
            ],
            'withdrawal_no_match_behavior' => ['sometimes', 'string', 'in:closest,empty'],
            'withdrawal_bank_options' => ['sometimes', 'array', 'max:40'],
            'withdrawal_bank_options.*' => ['string', 'max:60'],
            'withdrawal_require_payout_details' => ['sometimes', 'boolean'],
            'withdrawal_message_with_amount' => ['sometimes', 'string', 'max:600'],
            'withdrawal_message_no_amount' => ['sometimes', 'string', 'max:600'],
            'deposit_prefill_message' => ['sometimes', 'string', 'max:200'],
            'deposit_quick_amounts' => ['sometimes', 'array', 'max:12'],
            'deposit_quick_amounts.*' => ['integer', 'min:1'],
            'deposit_message' => ['sometimes', 'string', 'max:600'],
            'player_id_storage_key' => ['sometimes', 'nullable', 'string', 'max:120'],
            'player_id_dom_selector' => ['sometimes', 'nullable', 'string', 'max:300'],
            'recents_enabled' => ['sometimes', 'boolean'],
            'recents_count' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'pair_mode_enabled' => ['sometimes', 'boolean'],
            'pair_size' => ['sometimes', 'integer', 'min:1', 'max:5'],
            'pair_reset_enabled' => ['sometimes', 'boolean'],
            'pair_reset_hours' => ['sometimes', 'integer', 'min:1', 'max:720'],
        ];
    }

    public function messages(): array
    {
        return [
            'onboarding_video_url.regex' => 'Must be a valid YouTube URL (youtube.com/watch, youtu.be, or youtube.com/embed format) or empty.',
            'withdrawal_howto_video_url.regex' => 'Must be a valid YouTube URL (youtube.com/watch, youtu.be, or youtube.com/embed format) or empty.',
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
