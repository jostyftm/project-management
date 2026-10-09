<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Webhook extends Model
{
    use BelongsToWorkspace, HasFactory;

    protected $fillable = [
        'workspace_id',
        'url',
        'secret_token',
        'events_subscribed',
        'is_active',
    ];

    protected $casts = [
        'events_subscribed' => 'array',
        'is_active' => 'boolean',
    ];
}
