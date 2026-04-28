<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StatusEvent extends Model
{
    public const EVENT_WENT_ONLINE = 'went_online';

    public const EVENT_WENT_OFFLINE = 'went_offline';

    public const EVENT_EXTENDED = 'extended';

    public const EVENT_CREATED_BY_ADMIN = 'created_by_admin';

    public const EVENT_DISABLED_BY_ADMIN = 'disabled_by_admin';

    public const EVENT_ENABLED_BY_ADMIN = 'enabled_by_admin';

    public const EVENT_TOKEN_REGENERATED = 'token_regenerated';

    public const EVENT_DELETED_BY_ADMIN = 'deleted_by_admin';

    public const EVENT_TYPES = [
        self::EVENT_WENT_ONLINE,
        self::EVENT_WENT_OFFLINE,
        self::EVENT_EXTENDED,
        self::EVENT_CREATED_BY_ADMIN,
        self::EVENT_DISABLED_BY_ADMIN,
        self::EVENT_ENABLED_BY_ADMIN,
        self::EVENT_TOKEN_REGENERATED,
        self::EVENT_DELETED_BY_ADMIN,
    ];

    public $timestamps = false;

    protected $fillable = [
        'agent_id',
        'admin_id',
        'event_type',
        'duration_minutes',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class);
    }
}
