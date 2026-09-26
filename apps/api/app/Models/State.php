<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use App\Traits\HasSearchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class State extends Model
{
    use BelongsToWorkspace, HasFactory, HasSearchable;

    protected $fillable = [
        'workspace_id',
        'project_id',
        'name',
        'color',
        'group',
        'sequence',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'is_default' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(WorkItem::class);
    }
}
