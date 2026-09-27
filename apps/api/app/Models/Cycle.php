<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use App\Traits\HasSearchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Cycle extends Model
{
    use HasFactory, BelongsToWorkspace, HasSearchable;

    protected $fillable = [
        'workspace_id',
        'project_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'status', // DRAFT, UPCOMING, CURRENT, COMPLETED
        'owned_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owned_by');
    }

    public function workItems(): BelongsToMany
    {
        return $this->belongsToMany(WorkItem::class, 'cycle_work_items')
            ->using(CycleWorkItem::class)
            ->withPivot(['status_at_completion', 'transferred_to_cycle_id'])
            ->withTimestamps();
    }
}
