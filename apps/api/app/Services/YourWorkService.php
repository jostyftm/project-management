<?php

namespace App\Services;

use App\Models\WorkItem;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;

class YourWorkService
{
    /**
     * Obtiene los work items del usuario para la pestaña solicitada en el workspace activo.
     */
    public function getItems(Request $request): Collection|AbstractPaginator
    {
        $user = $request->user();
        $workspaceId = app('current_workspace_id');
        $tab = $request->query('tab', 'assigned'); // assigned, created, drafts

        $query = WorkItem::where('workspace_id', $workspaceId)
            ->with(['state', 'type', 'project', 'assignees', 'labels']);

        switch ($tab) {
            case 'created':
                $query->where('created_by', $user->id)->where('is_draft', false);
                break;
            case 'drafts':
                $query->where('created_by', $user->id)->where('is_draft', true);
                break;
            case 'assigned':
            default:
                $query->whereHas('assignees', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                })->where('is_draft', false);
                break;
        }

        return $query->orderBy('updated_at', 'desc')->paginate(30);
    }
}
