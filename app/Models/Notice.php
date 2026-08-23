<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Notice extends Model
{
    use SoftDeletes;

    public const PRIORITY_URGENT = 'urgent';

    public const PRIORITY_INFO = 'info';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_OFF = 'off';

    public const AUDIENCE_AGENT = 'agent';

    public const AUDIENCE_PLAYER = 'player';

    public const AUDIENCE_BOTH = 'both';

    protected $fillable = [
        'title',
        'body',
        'priority',
        'audience',
        'video_url',
        'is_active',
        'starts_at',
        'ends_at',
        'send_push',
        'created_by',
    ];

    protected $appends = ['status'];

    protected $attributes = [
        'priority' => self::PRIORITY_INFO,
        'audience' => self::AUDIENCE_AGENT,
        'is_active' => true,
        'send_push' => false,
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'send_push' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'created_by');
    }

    /**
     * Notices currently visible, optionally restricted to an audience.
     * $audience 'agent' or 'player' also includes 'both'; null = no filter.
     * Active, inside schedule window, urgent first then newest first.
     */
    public function scopeCurrentlyVisible(Builder $query, ?string $audience = null): Builder
    {
        return $query
            ->where('is_active', true)
            ->when($audience !== null, function (Builder $q) use ($audience) {
                $q->whereIn('audience', [$audience, self::AUDIENCE_BOTH]);
            })
            ->where(function (Builder $q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function (Builder $q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->orderByRaw("CASE WHEN priority = 'urgent' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at');
    }

    /**
     * Computed lifecycle status: off | expired | scheduled | active.
     */
    public function getStatusAttribute(): string
    {
        if (! $this->is_active) {
            return self::STATUS_OFF;
        }

        if ($this->ends_at !== null && $this->ends_at->lessThanOrEqualTo(now())) {
            return self::STATUS_EXPIRED;
        }

        if ($this->starts_at !== null && $this->starts_at->isFuture()) {
            return self::STATUS_SCHEDULED;
        }

        return self::STATUS_ACTIVE;
    }

    public function isCurrentlyVisible(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
