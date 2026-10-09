<?php

namespace App\Http\Controllers\Api\v1\Release;

use App\Http\Controllers\Controller;
use App\Http\Requests\Release\ReleaseCreateRequest;
use App\Http\Resources\Release\ReleaseResource;
use App\Models\Project;
use App\Models\Release;
use App\Services\ReleaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReleaseController extends Controller
{
    public function __construct(
        protected ReleaseService $releaseService
    ) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        $releases = $this->releaseService->list($project->id);

        return ReleaseResource::collection($releases);
    }

    public function store(ReleaseCreateRequest $request, Project $project): JsonResponse
    {
        $release = $this->releaseService->create($project->id, $request->validated());

        return (new ReleaseResource($release))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Release $release): ReleaseResource
    {
        return new ReleaseResource($release->load(['workItems.type', 'workItems.state', 'creator']));
    }

    public function update(Request $request, Release $release): ReleaseResource
    {
        $updated = $this->releaseService->update($release, $request->all());

        return new ReleaseResource($updated);
    }

    public function publish(Release $release): ReleaseResource
    {
        $updated = $this->releaseService->publish($release);

        return new ReleaseResource($updated);
    }

    public function generateChangelog(Release $release): JsonResponse
    {
        $changelog = $this->releaseService->generateChangelog($release);

        return response()->json([
            'message' => 'Changelog generado exitosamente',
            'changelog' => $changelog,
        ]);
    }

    public function destroy(Release $release): JsonResponse
    {
        $this->releaseService->delete($release);

        return response()->json(['message' => 'Release eliminado exitosamente']);
    }
}
