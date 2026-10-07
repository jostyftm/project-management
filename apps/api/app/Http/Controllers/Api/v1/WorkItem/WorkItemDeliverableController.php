<?php

namespace App\Http\Controllers\Api\v1\WorkItem;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkItem\WorkItemDeliverableCreateRequest;
use App\Http\Requests\WorkItem\WorkItemDeliverableReviewRequest;
use App\Http\Requests\WorkItem\WorkItemDodItemCreateRequest;
use App\Http\Resources\WorkItem\WorkItemDeliverableResource;
use App\Http\Resources\WorkItem\WorkItemDodItemResource;
use App\Models\Project;
use App\Models\WorkItem;
use App\Models\WorkItemDeliverable;
use App\Models\WorkItemDodItem;
use App\Services\WorkItemDeliverableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkItemDeliverableController extends Controller
{
    public function __construct(
        private WorkItemDeliverableService $deliverableService
    ) {}

    /**
     * List deliverables and DoD criteria for a work item
     */
    public function index(Project $project, WorkItem $workItem): JsonResponse
    {
        $data = $this->deliverableService->list($workItem, $project);

        return response()->json([
            'data' => [
                'deliverables' => WorkItemDeliverableResource::collection($data['deliverables']),
                'dod_items' => WorkItemDodItemResource::collection($data['dod_items']),
            ],
        ]);
    }

    /**
     * Create a new deliverable (external URL or physical file evidence)
     */
    public function store(
        WorkItemDeliverableCreateRequest $request,
        Project $project,
        WorkItem $workItem
    ): JsonResponse {
        $deliverable = $this->deliverableService->createDeliverable(
            $workItem,
            $project,
            $request->user(),
            $request->validated(),
            $request->file('file')
        );

        return (new WorkItemDeliverableResource($deliverable))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Delete an existing deliverable and clean up storage
     */
    public function destroy(
        Request $request,
        Project $project,
        WorkItem $workItem,
        WorkItemDeliverable $deliverable
    ): JsonResponse {
        $this->deliverableService->deleteDeliverable(
            $workItem,
            $project,
            $deliverable,
            $request->user()
        );

        return response()->json([
            'message' => 'Entregable eliminado exitosamente',
        ]);
    }

    /**
     * Review and certify a deliverable
     */
    public function review(
        WorkItemDeliverableReviewRequest $request,
        Project $project,
        WorkItem $workItem,
        WorkItemDeliverable $deliverable
    ): WorkItemDeliverableResource {
        $deliverable = $this->deliverableService->reviewDeliverable(
            $workItem,
            $project,
            $deliverable,
            $request->user(),
            $request->validated()
        );

        return new WorkItemDeliverableResource($deliverable);
    }

    /**
     * Download deliverable file from configured storage
     */
    public function download(
        Project $project,
        WorkItem $workItem,
        WorkItemDeliverable $deliverable
    ): StreamedResponse {
        return $this->deliverableService->downloadDeliverable($workItem, $project, $deliverable);
    }

    /**
     * Add a Definition of Done item
     */
    public function storeDod(
        WorkItemDodItemCreateRequest $request,
        Project $project,
        WorkItem $workItem
    ): JsonResponse {
        $dodItem = $this->deliverableService->createDodItem(
            $workItem,
            $project,
            $request->validated()
        );

        return (new WorkItemDodItemResource($dodItem))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Toggle completion state of a DoD item
     */
    public function toggleDod(
        Request $request,
        Project $project,
        WorkItem $workItem,
        WorkItemDodItem $dodItem
    ): WorkItemDodItemResource {
        $dodItem = $this->deliverableService->toggleDodItem(
            $workItem,
            $project,
            $dodItem,
            $request->user()
        );

        return new WorkItemDodItemResource($dodItem);
    }

    /**
     * Delete a DoD item
     */
    public function destroyDod(
        Project $project,
        WorkItem $workItem,
        WorkItemDodItem $dodItem
    ): JsonResponse {
        $this->deliverableService->deleteDodItem($workItem, $project, $dodItem);

        return response()->json([
            'message' => 'Criterio DoD eliminado exitosamente',
        ]);
    }
}
