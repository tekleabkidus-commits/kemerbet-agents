<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VisitEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'visitor_id',
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
}
