<?php

namespace App\Http\Controllers\Api\v1\WorkItem;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkItem\WorkItemCreateRequest;
use App\Http\Requests\WorkItem\WorkItemListRequest;
use App\Http\Requests\WorkItem\WorkItemUpdateRequest;
use App\Http\Resources\WorkItem\WorkItemResource;
use App\Models\Project;
use App\Models\WorkItem;
use App\Services\WorkItemService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;

class WorkItemController extends Controller
{
    public function __construct(
        private WorkItemService $workItemService
    ) {}

    /**
     * Listar work items de un proyecto.
     */
    public function index(WorkItemListRequest $request, Project $project): AnonymousResourceCollection
    {
        $workItems = $this->workItemService->list($request, $project);

        return WorkItemResource::collection($workItems);
    }

    /**
     * Crear un nuevo work item en un proyecto.
     */
    public function store(WorkItemCreateRequest $request, Project $project): JsonResource
    {
        $workItem = $this->workItemService->save($request, $project);

        return new WorkItemResource($workItem);
    }

    /**
     * Ver detalles de un work item.
     */
    public function show(WorkItem $workItem): JsonResource
    {
        $workItem = $this->workItemService->get($workItem);

        return new WorkItemResource($workItem);
    }

    /**
     * Actualizar propiedades de un work item.
     */
    public function update(WorkItemUpdateRequest $request, WorkItem $workItem): JsonResource
    {
        $workItem = $this->workItemService->update($request, $workItem);

        return new WorkItemResource($workItem);
    }

    /**
     * Eliminar un work item.
     */
    public function destroy(Request $request, WorkItem $workItem): Response
    {
        $this->workItemService->delete($workItem, $request);

        return response()->noContent();
    }
}
