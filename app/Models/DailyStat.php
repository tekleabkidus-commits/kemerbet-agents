<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyStat extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'date',
        'agent_id',
        'total_visits',
        'unique_visitors',
        'deposit_clicks',
        'chat_clicks',
        'minutes_live',
        'times_went_online',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'created_at' => 'datetime',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
