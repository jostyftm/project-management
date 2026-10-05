<?php

namespace App\Http\Controllers\Api\v1\Workspace;

use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\WorkspaceCreateRequest;
use App\Http\Requests\Workspace\WorkspaceListRequest;
use App\Http\Requests\Workspace\WorkspaceMemberCreateRequest;
use App\Http\Requests\Workspace\WorkspaceUpdateRequest;
use App\Http\Resources\Workspace\WorkspaceMemberResource;
use App\Http\Resources\Workspace\WorkspaceResource;
use App\Models\Workspace;
use App\Services\WorkspaceService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;

class WorkspaceController extends Controller
{
    public function __construct(
        private WorkspaceService $workspaceService
    ) {}

    /**
     * Listar workspaces del usuario actual.
     */
    public function index(WorkspaceListRequest $request): AnonymousResourceCollection
    {
        $workspaces = $this->workspaceService->list($request);

        return WorkspaceResource::collection($workspaces);
    }

    /**
     * Crear un nuevo workspace.
     */
    public function store(WorkspaceCreateRequest $request): JsonResource
    {
        $workspace = $this->workspaceService->save($request);

        return new WorkspaceResource($workspace);
    }

    /**
     * Ver detalles de un workspace.
     */
    public function show(Workspace $workspace): JsonResource
    {
        $workspace = $this->workspaceService->get($workspace);

        return new WorkspaceResource($workspace);
    }

    /**
     * Actualizar workspace.
     */
    public function update(WorkspaceUpdateRequest $request, Workspace $workspace): JsonResource
    {
        $user = $request->user();
        abort_if(
            (int) $workspace->owner_id !== (int) $user->id && ! $user->is_instance_admin,
            403,
            'Solo el dueño del workspace puede modificar su configuración.'
        );

        $workspace = $this->workspaceService->update($request, $workspace);

        return new WorkspaceResource($workspace);
    }

    /**
     * Eliminar workspace.
     */
    public function destroy(Workspace $workspace): Response
    {
        $user = auth()->user();
        abort_if(
            (int) $workspace->owner_id !== (int) $user->id && ! $user->is_instance_admin,
            403,
            'Solo el dueño del workspace puede eliminar el espacio de trabajo.'
        );

        $this->workspaceService->delete($workspace);

        return response()->noContent();
    }

    /**
     * Invitar/Agregar miembro al workspace.
     */
    public function addMember(WorkspaceMemberCreateRequest $request, Workspace $workspace): JsonResource
    {
        $member = $this->workspaceService->addMember($request, $workspace);

        return new WorkspaceMemberResource($member);
    }

    /**
     * Listar miembros del workspace.
     */
    public function members(Workspace $workspace): AnonymousResourceCollection
    {
        $members = $this->workspaceService->listMembers($workspace);

        return WorkspaceMemberResource::collection($members);
    }
}
