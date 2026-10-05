<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GithubPullRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_item_id',
        'project_github_repo_id',
        'repository_name',
        'repository_label',
        'pr_number',
        'title',
        'state',
        'is_merged',
        'preview_url',
        'head_branch',
        'base_branch',
        'html_url',
        'author_username',
        'author_avatar_url',
        'merged_at',
    ];

    protected $casts = [
        'pr_number' => 'integer',
        'is_merged' => 'boolean',
        'merged_at' => 'datetime',
    ];

    public function workItem(): BelongsTo
    {
        return $this->belongsTo(WorkItem::class);
    }

    public function repository(): BelongsTo
    {
        return $this->belongsTo(ProjectGithubRepository::class, 'project_github_repo_id');
    }
}
