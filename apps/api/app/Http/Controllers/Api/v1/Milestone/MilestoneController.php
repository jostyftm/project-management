<?php

namespace App\Http\Controllers\Api\v1\Milestone;

use App\Http\Controllers\Controller;
use App\Http\Requests\Milestone\MilestoneCreateRequest;
use App\Http\Resources\Milestone\MilestoneResource;
use App\Models\Milestone;
use App\Models\Project;
use App\Services\MilestoneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MilestoneController extends Controller
{
    public function __construct(
        protected MilestoneService $milestoneService
    ) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        $milestones = $this->milestoneService->list($project->id);
        return MilestoneResource::collection($milestones);
    }

    public function store(MilestoneCreateRequest $request, Project $project): JsonResponse
    {
        $milestone = $this->milestoneService->create($project->id, $request->validated());
        return (new MilestoneResource($milestone))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Milestone $milestone): MilestoneResource
    {
        return new MilestoneResource($milestone->load(['workItems.state', 'project']));
    }

    public function update(Request $request, Milestone $milestone): MilestoneResource
    {
        $updated = $this->milestoneService->update($milestone, $request->all());
        return new MilestoneResource($updated);
    }

    public function toggleComplete(Milestone $milestone): MilestoneResource
    {
        $updated = $this->milestoneService->toggleComplete($milestone);
        return new MilestoneResource($updated);
    }

    public function destroy(Milestone $milestone): JsonResponse
    {
        $this->milestoneService->delete($milestone);
        return response()->json(['message' => 'Hito eliminado exitosamente']);
    }
}
