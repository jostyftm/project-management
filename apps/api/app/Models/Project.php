<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use App\Traits\HasCacheInvalidation;
use App\Traits\HasSearchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Project extends Model
{
    use BelongsToWorkspace, HasCacheInvalidation, HasFactory, HasSearchable;

    protected $fillable = [
        'workspace_id',
        'name',
        'identifier',
        'description',
        'icon',
        'is_archived',
        'is_public',
        'lead_id',
        'estimate_system',
        'start_date',
        'target_date',
    ];

    protected function casts(): array
    {
        return [
            'is_archived' => 'boolean',
            'is_public' => 'boolean',
            'start_date' => 'date',
            'target_date' => 'date',
        ];
    }

    public function getCacheKeyPattern(): string
    {
        return 'project_{id}';
    }

    public function getCacheTags(): array
    {
        return ['projects', 'workspace_'.$this->workspace_id];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members')
            ->withPivot('id', 'role')
            ->withTimestamps();
    }

    public function projectMembers(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(ProjectInvitation::class);
    }

    public function states(): HasMany
    {
        return $this->hasMany(State::class)->orderBy('sequence');
    }

    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(WorkItem::class);
    }

    public function cycles(): HasMany
    {
        return $this->hasMany(Cycle::class);
    }

    public function modules(): HasMany
    {
        return $this->hasMany(Module::class);
    }

    public function workItemTypes(): HasMany
    {
        return $this->hasMany(WorkItemType::class);
    }

    public function githubRepositories(): HasMany
    {
        return $this->hasMany(ProjectGithubRepository::class);
    }

    public function githubSetting(): HasOne
    {
        return $this->hasOne(ProjectGithubSetting::class);
    }

    public function automationRules(): HasMany
    {
        return $this->hasMany(AutomationRule::class);
    }

    public function recurringWorkItems(): HasMany
    {
        return $this->hasMany(RecurringWorkItem::class);
    }
}
