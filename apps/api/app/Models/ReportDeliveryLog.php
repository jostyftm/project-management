<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportDeliveryLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_id',
        'schedule_id',
        'recipients',
        'status',
        'error_message',
        'sent_at',
    ];

    protected $casts = [
        'recipients' => 'array',
        'sent_at'    => 'datetime',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(WorkspaceReport::class, 'report_id');
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ReportSchedule::class, 'schedule_id');
    }
}
