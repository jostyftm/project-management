<?php

namespace App\Models;

use App\Enums\ScheduleFrequency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_id',
        'frequency',
        'cron_expression',
        'recipients',
        'next_run_at',
        'last_run_at',
        'is_active',
    ];

    protected $casts = [
        'frequency' => ScheduleFrequency::class,
        'recipients' => 'array',
        'next_run_at' => 'datetime',
        'last_run_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(WorkspaceReport::class, 'report_id');
    }
}
