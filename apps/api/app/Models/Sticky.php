<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sticky extends Model
{
    use BelongsToWorkspace, HasFactory, SoftDeletes;

    protected $fillable = [
        'workspace_id',
        'content',
        'color',
        'is_pinned',
        'is_private',
        'position_x',
        'position_y',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'is_private' => 'boolean',
            'position_x' => 'integer',
            'position_y' => 'integer',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeAccessibleByUser(Builder $query, int $userId): Builder
    {
        return $query->where(function (Builder $q) use ($userId) {
            $q->where('is_private', false)
              ->orWhere(function (Builder $sub) use ($userId) {
                  $sub->where('is_private', true)
                      ->where('created_by', $userId);
              });
        });
    }
}
