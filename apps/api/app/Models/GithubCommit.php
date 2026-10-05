<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GithubCommit extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_item_id',
        'project_github_repo_id',
        'repository_label',
        'sha',
        'message',
        'author_name',
        'html_url',
        'committed_at',
    ];

    protected $casts = [
        'committed_at' => 'datetime',
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
