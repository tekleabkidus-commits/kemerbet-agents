<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One agent that was given to one player identity (a device or a player ID).
 * See AgentPairingService for how these rows are read and written.
 */
class PlayerAgentAssignment extends Model
{
    public const SUBJECT_DEVICE = 'device';

    public const SUBJECT_PLAYER = 'player';

    public $timestamps = false;

    protected $fillable = [
        'subject_type',
        'subject_key',
        'agent_id',
        'first_assigned_at',
        'last_shown_at',
        'last_deposit_shown_at',
    ];

    protected function casts(): array
    {
        return [
            'first_assigned_at' => 'datetime',
            'last_shown_at' => 'datetime',
            'last_deposit_shown_at' => 'datetime',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
