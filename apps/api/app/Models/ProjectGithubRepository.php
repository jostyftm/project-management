<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectGithubRepository extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'repo_full_name',
        'label',
        'repo_url',
        'default_branch',
        'webhook_secret',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function pullRequests(): HasMany
    {
        return $this->hasMany(GithubPullRequest::class, 'project_github_repo_id');
    }

    public function commits(): HasMany
    {
        return $this->hasMany(GithubCommit::class, 'project_github_repo_id');
    }
}
