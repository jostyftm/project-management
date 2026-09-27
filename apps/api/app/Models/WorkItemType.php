<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use App\Traits\HasSearchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkItemType extends Model
{
    use HasFactory, BelongsToWorkspace, HasSearchable;

    protected $fillable = [
        'workspace_id',
        'project_id',
        'name',
        'description',
        'icon',
        'color',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(WorkItem::class, 'type_id');
    }
}
