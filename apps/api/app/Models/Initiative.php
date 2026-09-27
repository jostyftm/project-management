<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Initiative extends Model
{
    use BelongsToWorkspace, HasFactory, SoftDeletes;

    protected $fillable = [
        'workspace_id',
        'title',
        'description',
        'target_date',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'target_date' => 'date:Y-m-d',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'initiative_projects')
            ->withTimestamps();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
