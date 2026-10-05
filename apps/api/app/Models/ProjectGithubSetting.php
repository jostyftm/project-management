<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectGithubSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'auto_start_on_pr',
        'auto_complete_on_pr_merge',
        'require_all_prs_merged',
        'started_state_id',
        'completed_state_id',
    ];

    protected $casts = [
        'auto_start_on_pr' => 'boolean',
        'auto_complete_on_pr_merge' => 'boolean',
        'require_all_prs_merged' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function startedState(): BelongsTo
    {
        return $this->belongsTo(State::class, 'started_state_id');
    }

    public function completedState(): BelongsTo
    {
        return $this->belongsTo(State::class, 'completed_state_id');
    }
}
