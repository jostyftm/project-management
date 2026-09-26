<?php

namespace App\Traits;

use App\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Scope;

class WorkspaceScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $workspaceId = app()->has('current_workspace_id') ? app('current_workspace_id') : null;

        if ($workspaceId) {
            $builder->where($model->qualifyColumn('workspace_id'), $workspaceId);
        }
    }
}

trait BelongsToWorkspace
{
    /**
     * Boot the trait.
     */
    public static function bootBelongsToWorkspace(): void
    {
        static::addGlobalScope(new WorkspaceScope);

        static::creating(function (Model $model) {
            if (empty($model->workspace_id) && app()->has('current_workspace_id')) {
                $model->workspace_id = app('current_workspace_id');
            }
        });
    }

    /**
     * Relationship to the Workspace.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
