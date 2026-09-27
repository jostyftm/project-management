<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkItemRelation extends Model
{
    use HasFactory, BelongsToWorkspace;

    protected $fillable = [
        'workspace_id',
        'source_id',
        'target_id',
        'relation_type', // BLOCKS, BLOCKED_BY, RELATES_TO, DUPLICATE_OF
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(WorkItem::class, 'source_id');
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(WorkItem::class, 'target_id');
    }
}
