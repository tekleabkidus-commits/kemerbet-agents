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

    public const DEFAULT_RANK = 5;

    protected $fillable = [
        'display_number',
        'telegram_username',
        'status',
        'min_birr',
        'max_birr',
        'notes',
        'pinned_at',
        'accepts_withdrawals',
        'withdrawal_max',
        'withdrawal_id',
        'live_until',
        'last_status_change_at',
        'rank_override_level',
        'rank_override_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'live_until' => 'datetime',
            'pinned_at' => 'datetime',
            'last_status_change_at' => 'datetime',
            'rank_override_level' => 'integer',
            'rank_override_expires_at' => 'datetime',
            'min_birr' => 'decimal:4',
            'max_birr' => 'decimal:4',
            'accepts_withdrawals' => 'boolean',
            'withdrawal_max' => 'decimal:4',
        ];
    }

    public function activeRankOverride(): bool
    {
        return $this->rank_override_level !== null
            && $this->rank_override_expires_at !== null
            && $this->rank_override_expires_at->isFuture()
            && $this->rank_override_level >= 1
            && $this->rank_override_level <= 10;
    }

    public function effectiveRank(): int
    {
        return $this->activeRankOverride() ? (int) $this->rank_override_level : self::DEFAULT_RANK;
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

    /**
     * Banks/methods this agent will PAY OUT to (withdrawals). Managed by admin
     * separately from deposit methods (paymentMethods), reusing the same
     * PaymentMethod catalog via a distinct pivot.
     */
    public function withdrawalMethods(): BelongsToMany
    {
        return $this->belongsToMany(PaymentMethod::class, 'agent_withdrawal_methods')
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

    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
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

    /**
     * True when the agent is eligible to appear in withdrawal results at all.
     * Requires the toggle on, a positive max, and a withdrawal_id — without an
     * ID we cannot build a valid auto-message, so the agent is silently
     * excluded from withdrawals (deposit listings are unaffected).
     */
    public function canWithdraw(): bool
    {
        return $this->accepts_withdrawals === true
            && $this->withdrawal_id !== null
            && $this->withdrawal_id !== ''
            && $this->withdrawal_max !== null
            && (float) $this->withdrawal_max > 0;
    }

    /**
     * True when this agent can pay out the requested amount in a single
     * withdrawal (i.e. their max covers it). Caller is responsible for the
     * canWithdraw() gate; this only compares the amount to the max.
     */
    public function coversWithdrawal(float $amount): bool
    {
        return $this->withdrawal_max !== null
            && (float) $this->withdrawal_max >= $amount;
    }
}
