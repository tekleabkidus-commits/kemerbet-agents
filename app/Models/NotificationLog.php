<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationLog extends Model
{
    use HasFactory;

    public const TYPE_PRE_EXPIRATION_15 = 'pre_expiration_15';

    public const TYPE_PRE_EXPIRATION_10 = 'pre_expiration_10';

    public const TYPE_PRE_EXPIRATION_5 = 'pre_expiration_5';

    public const TYPE_SLEEP_WARNING_5 = 'sleep_warning_5';

    public const TYPE_POST_OFFLINE_15MIN = 'post_offline_15min';

    public const TYPE_POST_OFFLINE_1H = 'post_offline_1h';

    public const TYPE_POST_OFFLINE_3H = 'post_offline_3h';

    public const TYPE_POST_OFFLINE_6H = 'post_offline_6h';

    public const TYPE_POST_OFFLINE_12H = 'post_offline_12h';

    public const TYPE_SLEEP_POST_OFFLINE_15 = 'sleep_post_offline_15';

    public const TYPE_WAKEUP_7AM = 'wakeup_7am';

    public const TYPES = [
        self::TYPE_PRE_EXPIRATION_15,
        self::TYPE_PRE_EXPIRATION_10,
        self::TYPE_PRE_EXPIRATION_5,
        self::TYPE_SLEEP_WARNING_5,
        self::TYPE_POST_OFFLINE_15MIN,
        self::TYPE_POST_OFFLINE_1H,
        self::TYPE_POST_OFFLINE_3H,
        self::TYPE_POST_OFFLINE_6H,
        self::TYPE_POST_OFFLINE_12H,
        self::TYPE_SLEEP_POST_OFFLINE_15,
        self::TYPE_WAKEUP_7AM,
    ];

    public $timestamps = false;

    protected $table = 'notification_log';

    protected $fillable = [
        'agent_id',
        'notification_type',
        'reference_timestamp',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'reference_timestamp' => 'datetime',
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public static function hasFired(Agent $agent, string $type, Carbon $refTimestamp): bool
    {
        return static::where('agent_id', $agent->id)
            ->where('notification_type', $type)
            ->where('reference_timestamp', $refTimestamp)
            ->exists();
    }
}
