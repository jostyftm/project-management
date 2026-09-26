<?php

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WorkspaceService
{
    /**
     * Lista los workspaces en los que participa el usuario actual.
     */
    public function list(Request $request): Collection|AbstractPaginator
    {
        $user = $request->user();

        return (new Workspace)->search(
            request: $request,
            relationships: ['owner'],
            callback: function ($builder) use ($user) {
                if ($user) {
                    $builder->where(function ($q) use ($user) {
                        $q->where('owner_id', $user->id)
                            ->orWhereHas('workspaceMembers', function ($sub) use ($user) {
                                $sub->where('user_id', $user->id);
                            });
                    });
                }
            },
            filters: ['name', 'slug'],
            sorts: ['created_at', 'name']
        );
    }

    /**
     * Obtiene un workspace por ID o Slug.
     */
    public function get(Workspace $workspace): Workspace
    {
        return $workspace->load(['owner', 'members']);
    }

    /**
     * Crea un nuevo workspace y asigna al creador como OWNER.
     */
    public function save(Request $request): Workspace
    {
        $data = $request->validated();
        $user = $request->user();

        return DB::transaction(function () use ($data, $user) {
            $baseSlug = $data['slug'] ?? Str::slug($data['name']);
            $slug = $baseSlug;
            $counter = 1;

            while (Workspace::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter++;
            }

            $workspace = Workspace::create([
                'name' => $data['name'],
                'slug' => $slug,
                'logo_url' => $data['logo_url'] ?? null,
                'owner_id' => $user->id,
            ]);

            WorkspaceMember::create([
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'role' => 'OWNER',
                'joined_at' => now(),
            ]);

            return $workspace;
        });
    }

    /**
     * Actualiza propiedades del workspace.
     */
    public function update(Request $request, Workspace $workspace): Workspace
    {
        $data = $request->validated();
        $workspace->update($data);

        return $workspace;
    }

    /**
     * Elimina el workspace.
     */
    public function delete(Workspace $workspace): void
    {
        $workspace->delete();
    }

    /**
     * Agrega o invita a un miembro al workspace.
     */
    public function addMember(Request $request, Workspace $workspace): WorkspaceMember
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            // Auto-aprovisionar usuario invitado si no existe
            $user = User::create([
                'name' => explode('@', $data['email'])[0],
                'email' => $data['email'],
                'password' => bcrypt(Str::random(16)),
            ]);
        }

        $existing = WorkspaceMember::where('workspace_id', $workspace->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            throw ValidationException::withMessages([
                'email' => ['El usuario ya es miembro de este workspace.'],
            ]);
        }

        return WorkspaceMember::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'role' => $data['role'],
            'joined_at' => now(),
        ])->load('user');
    }

    /**
     * Lista los miembros de un workspace.
     */
    public function listMembers(Workspace $workspace): Collection
    {
        return $workspace->workspaceMembers()->with('user')->get();
    }
}
