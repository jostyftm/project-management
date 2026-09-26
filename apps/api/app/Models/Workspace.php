<?php

namespace App\Models;

use App\Traits\HasCacheInvalidation;
use App\Traits\HasSearchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workspace extends Model
{
    use HasCacheInvalidation, HasFactory, HasSearchable;

    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'owner_id',
    ];

    public function getCacheKeyPattern(): string
    {
        return 'workspace_{id}';
    }

    public function getCacheTags(): array
    {
        return ['workspaces'];
    }

    protected function shouldInvalidateCacheOnSave(): bool
    {
        return $this->isDirty(['name', 'slug', 'logo_url', 'owner_id']);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'workspace_members')
            ->withPivot('id', 'role', 'joined_at')
            ->withTimestamps();
    }

    public function workspaceMembers(): HasMany
    {
        return $this->hasMany(WorkspaceMember::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(WorkItem::class);
    }
}
