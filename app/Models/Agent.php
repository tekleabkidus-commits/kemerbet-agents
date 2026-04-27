<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Agent extends Model
{
    use SoftDeletes;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_DISABLED = 'disabled';

    protected $fillable = [
        'display_number',
        'telegram_username',
        'status',
        'min_birr',
        'max_birr',
        'notes',
        'live_until',
        'last_status_change_at',
    ];

    protected function casts(): array
    {
        return [
            'live_until' => 'datetime',
            'last_status_change_at' => 'datetime',
            'min_birr' => 'decimal:4',
            'max_birr' => 'decimal:4',
        ];
    }

    // --- Relationships ---

    public function tokens(): HasMany
    {
        return $this->hasMany(AgentToken::class);
    }

    public function activeToken(): HasOne
    {
        return $this->hasOne(AgentToken::class)
            ->whereNull('revoked_at')
            ->latest('created_at');
    }

    public function paymentMethods(): BelongsToMany
    {
        return $this->belongsToMany(PaymentMethod::class, 'agent_payment_methods')
            ->withPivot('created_at');
    }

    public function statusEvents(): HasMany
    {
        return $this->hasMany(StatusEvent::class);
    }

    public function clickEvents(): HasMany
    {
        return $this->hasMany(ClickEvent::class);
    }

    // --- Query helpers ---

    public function isLive(): bool
    {
        return $this->live_until !== null && $this->live_until->isFuture();
    }

    public function isRecentlyOffline(): bool
    {
        if ($this->live_until === null) {
            return false;
        }

        $hideAfterHours = (int) config('kemerbet.agent_hide_after_hours', 12);

        return $this->live_until->isPast()
            && $this->live_until->greaterThan(now()->subHours($hideAfterHours));
    }
}
