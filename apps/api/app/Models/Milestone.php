<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Milestone extends Model
{
    use BelongsToWorkspace, HasFactory, SoftDeletes;

    protected $fillable = [
        'workspace_id',
        'project_id',
        'title',
        'description',
        'target_date',
        'status',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'target_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function workItems(): BelongsToMany
    {
        return $this->belongsToMany(WorkItem::class, 'milestone_work_items')
            ->withTimestamps();
    }
}
