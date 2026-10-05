<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_id',
        'created_by',
        'title',
        'blocks_snapshot',
        'theme_snapshot',
        'note',
    ];

    protected $casts = [
        'blocks_snapshot' => 'array',
        'theme_snapshot'  => 'array',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(WorkspaceReport::class, 'report_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
