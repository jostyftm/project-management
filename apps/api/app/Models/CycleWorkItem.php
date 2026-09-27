<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CycleWorkItem extends Pivot
{
    protected $table = 'cycle_work_items';

    protected $fillable = [
        'cycle_id',
        'work_item_id',
        'status_at_completion',
        'transferred_to_cycle_id',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class);
    }

    public function workItem(): BelongsTo
    {
        return $this->belongsTo(WorkItem::class);
    }

    public function transferredToCycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class, 'transferred_to_cycle_id');
    }
}
