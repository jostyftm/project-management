<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use App\Traits\HasSearchable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class View extends Model
{
    use HasFactory, BelongsToWorkspace, HasSearchable;

    protected $fillable = [
        'workspace_id',
        'project_id',
        'name',
        'description',
        'filters',
        'display_filters',
        'created_by',
    ];

    protected $casts = [
        'filters' => 'array',
        'display_filters' => 'array',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Filtra las vistas para que sean estrictamente privadas del creador (Regla de negocio acordada).
     */
    public function scopeForCreator(Builder $query, int $userId): Builder
    {
        return $query->where('created_by', $userId);
    }
}
