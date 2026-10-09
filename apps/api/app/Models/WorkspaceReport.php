<?php

namespace App\Models;

use App\Enums\ReportVisibility;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class WorkspaceReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'owner_id',
        'title',
        'description',
        'visibility',
        'theme',
        'layout_config',
        'public_token',
        'published_at',
    ];

    protected $casts = [
        'theme' => 'array',
        'layout_config' => 'array',
        'visibility' => ReportVisibility::class,
        'published_at' => 'datetime',
    ];

    // Relaciones
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(ReportBlock::class, 'report_id')->orderBy('position');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(ReportSchedule::class, 'report_id');
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(ReportSnapshot::class, 'report_id')->latest();
    }

    public function deliveryLogs(): HasMany
    {
        return $this->hasMany(ReportDeliveryLog::class, 'report_id');
    }

    // Scopes
    public function scopeForWorkspace($query, int $workspaceId)
    {
        return $query->where('workspace_id', $workspaceId);
    }

    public function scopeVisibleToUser($query, int $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('owner_id', $userId)
                ->orWhereIn('visibility', [ReportVisibility::WORKSPACE->value, ReportVisibility::PUBLIC->value]);
        });
    }

    /** Genera un token público único */
    public function generatePublicToken(): string
    {
        $this->public_token = Str::random(32);
        $this->save();

        return $this->public_token;
    }
}
