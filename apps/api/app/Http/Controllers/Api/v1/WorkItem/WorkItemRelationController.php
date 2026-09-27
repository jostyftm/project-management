<?php

namespace App\Http\Controllers\Api\v1\WorkItem;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkItem\WorkItemRelationRequest;
use App\Models\WorkItem;
use App\Services\WorkItemService;
use Illuminate\Http\JsonResponse;

class WorkItemRelationController extends Controller
{
    public function __construct(
        protected WorkItemService $workItemService
    ) {}

    public function store(WorkItemRelationRequest $request, WorkItem $workItem): JsonResponse
    {
        $data = $request->validated();
        $relation = $this->workItemService->addRelation(
            $workItem,
            $data['target_id'],
            $data['relation_type'] ?? 'RELATES_TO'
        );

        return response()->json([
            'message' => 'Relación creada exitosamente',
            'data' => $relation,
        ], 201);
    }

    public function destroy(int $relationId): JsonResponse
    {
        $this->workItemService->removeRelation($relationId);

        return response()->json([
            'message' => 'Relación eliminada exitosamente',
        ], 200);
    }
}
