<?php

namespace App\Services;

use App\Models\Sticky;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

class StickyService
{
    public function list(Request $request): Collection
    {
        $userId = auth()->id();

        return Sticky::query()
            ->accessibleByUser($userId)
            ->with('creator')
            ->orderByDesc('is_pinned')
            ->orderByDesc('updated_at')
            ->get();
    }

    public function create(array $data): Sticky
    {
        $user = auth()->user();
        $workspaceId = $data['workspace_id'] ?? request()->header('X-Workspace-Id') ?? $user?->current_workspace_id;

        return Sticky::create([
            'workspace_id' => $workspaceId,
            'content' => $data['content'] ?? 'Nueva nota rápida',
            'color' => $data['color'] ?? 'yellow',
            'is_pinned' => $data['is_pinned'] ?? false,
            'is_private' => $data['is_private'] ?? false,
            'position_x' => $data['position_x'] ?? 0,
            'position_y' => $data['position_y'] ?? 0,
            'created_by' => $user?->id,
        ])->load('creator');
    }

    public function update(Sticky $sticky, array $data): Sticky
    {
        $userId = auth()->id();

        // If sticky is private and belongs to another user, forbid
        if ($sticky->is_private && $sticky->created_by !== $userId) {
            abort(403, 'No tienes permiso para modificar esta nota privada.');
        }

        $sticky->fill($data);
        $sticky->save();

        return $sticky->load('creator');
    }

    public function togglePin(Sticky $sticky): Sticky
    {
        $sticky->is_pinned = ! $sticky->is_pinned;
        $sticky->save();

        return $sticky->load('creator');
    }

    public function togglePrivacy(Sticky $sticky): Sticky
    {
        $userId = auth()->id();
        if ($sticky->created_by !== $userId) {
            abort(403, 'Solo el autor puede cambiar la privacidad de esta nota.');
        }

        $sticky->is_private = ! $sticky->is_private;
        $sticky->save();

        return $sticky->load('creator');
    }

    public function delete(Sticky $sticky): void
    {
        $userId = auth()->id();
        if ($sticky->is_private && $sticky->created_by !== $userId) {
            abort(403, 'No tienes permiso para eliminar esta nota privada.');
        }

        $sticky->delete();
    }
}
