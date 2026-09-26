<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use App\Traits\HasSearchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Label extends Model
{
    use BelongsToWorkspace, HasFactory, HasSearchable;

    protected $fillable = [
        'workspace_id',
        'project_id',
        'name',
        'color',
        'description',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function workItems(): BelongsToMany
    {
        return $this->belongsToMany(WorkItem::class, 'work_item_labels');
    }
}
