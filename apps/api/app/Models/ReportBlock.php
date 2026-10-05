<?php

namespace App\Models;

use App\Enums\BlockType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportBlock extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_id',
        'type',
        'title',
        'position',
        'width',
        'config',
        'data_cache',
        'cached_at',
        'is_visible',
    ];

    protected $casts = [
        'type'       => BlockType::class,
        'config'     => 'array',
        'data_cache' => 'array',
        'cached_at'  => 'datetime',
        'is_visible' => 'boolean',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(WorkspaceReport::class, 'report_id');
    }

    // Scopes
    public function scopeVisible($query)
    {
        return $query->where('is_visible', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('position');
    }

    /** Verifica si el caché sigue siendo válido (TTL 5 minutos) */
    public function isCacheValid(): bool
    {
        if (!$this->cached_at) {
            return false;
        }
        return $this->cached_at->diffInMinutes(now()) < 5;
    }
}
