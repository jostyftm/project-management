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

class WorkItem extends Model
{
    use BelongsToWorkspace, HasCacheInvalidation, HasFactory, HasSearchable;

    protected $fillable = [
        'workspace_id',
        'project_id',
        'sequence_id',
        'title',
        'description_json',
        'state_id',
        'type_id',
        'priority',
        'parent_id',
        'lead_id',
        'milestone_id',
        'estimate_points',
        'estimate_value',
        'start_date',
        'target_date',
        'completed_at',
        'is_draft',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'sequence_id' => 'integer',
            'description_json' => 'array',
            'estimate_points' => 'float',
            'start_date' => 'date',
            'target_date' => 'date',
            'completed_at' => 'datetime',
            'is_draft' => 'boolean',
        ];
    }

    public function getCacheKeyPattern(): string
    {
        return 'work_item_{id}';
    }

    public function getCacheTags(): array
    {
        return ['work_items', 'project_'.$this->project_id];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function state(): BelongsTo
    {
        return $this->belongsTo(State::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(WorkItem::class, 'parent_id');
    }

    public function subItems(): HasMany
    {
        return $this->hasMany(WorkItem::class, 'parent_id');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'work_item_assignees');
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'work_item_labels');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(WorkItemType::class, 'type_id');
    }

    public function cycles(): BelongsToMany
    {
        return $this->belongsToMany(Cycle::class, 'cycle_work_items')
            ->using(CycleWorkItem::class)
            ->withPivot(['status_at_completion', 'transferred_to_cycle_id'])
            ->withTimestamps();
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'module_work_items');
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(Milestone::class);
    }

    public function milestones(): BelongsToMany
    {
        return $this->belongsToMany(Milestone::class, 'milestone_work_items')->withTimestamps();
    }

    public function outwardRelations(): HasMany
    {
        return $this->hasMany(WorkItemRelation::class, 'source_id');
    }

    public function inwardRelations(): HasMany
    {
        return $this->hasMany(WorkItemRelation::class, 'target_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->latest();
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'entity_id')
            ->where('entity_type', 'WORK_ITEM')
            ->latest();
    }

    public function githubPullRequests(): HasMany
    {
        return $this->hasMany(GithubPullRequest::class)->latest();
    }

    public function githubCommits(): HasMany
    {
        return $this->hasMany(GithubCommit::class)->latest('committed_at');
    }

    public function deliverables(): HasMany
    {
        return $this->hasMany(WorkItemDeliverable::class)->latest();
    }

    public function dodItems(): HasMany
    {
        return $this->hasMany(WorkItemDodItem::class)->oldest();
    }
}
