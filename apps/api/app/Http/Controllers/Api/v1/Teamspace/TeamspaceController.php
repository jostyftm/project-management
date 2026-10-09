<?php

namespace App\Http\Controllers\Api\v1\Teamspace;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teamspace\TeamspaceCreateRequest;
use App\Http\Resources\Teamspace\TeamspaceResource;
use App\Models\Teamspace;
use App\Services\TeamspaceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeamspaceController extends Controller
{
    public function __construct(
        protected TeamspaceService $teamspaceService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $teamspaces = $this->teamspaceService->list($request);

        return TeamspaceResource::collection($teamspaces);
    }

    public function store(TeamspaceCreateRequest $request): JsonResponse
    {
        $teamspace = $this->teamspaceService->create($request->validated());

        return (new TeamspaceResource($teamspace))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Teamspace $teamspace): TeamspaceResource
    {
        $loaded = $this->teamspaceService->get($teamspace);

        return new TeamspaceResource($loaded);
    }

    public function update(Request $request, Teamspace $teamspace): TeamspaceResource
    {
        $updated = $this->teamspaceService->update($teamspace, $request->all());

        return new TeamspaceResource($updated);
    }

    public function destroy(Request $request, Teamspace $teamspace): JsonResponse
    {
        $this->teamspaceService->delete($teamspace);

        return response()->json(['message' => 'Teamspace eliminado exitosamente']);
    }
}
