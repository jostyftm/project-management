<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Teamspace extends Model
{
    use BelongsToWorkspace, HasFactory, SoftDeletes;

    protected $fillable = [
        'workspace_id',
        'name',
        'slug',
        'description',
        'icon',
        'created_by',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'teamspace_projects')
            ->withTimestamps();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
