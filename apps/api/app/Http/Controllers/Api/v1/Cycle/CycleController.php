<?php

namespace App\Http\Controllers\Api\v1\Cycle;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cycle\CycleCompleteRequest;
use App\Http\Requests\Cycle\CycleCreateRequest;
use App\Http\Requests\Cycle\CycleUpdateRequest;
use App\Http\Resources\Cycle\CycleResource;
use App\Models\Cycle;
use App\Models\Project;
use App\Models\WorkItem;
use App\Services\CycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CycleController extends Controller
{
    public function __construct(
        protected CycleService $cycleService
    ) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $cycles = $this->cycleService->list($request, $project);

        return CycleResource::collection($cycles);
    }

    public function store(CycleCreateRequest $request, Project $project): JsonResponse
    {
        $cycle = $this->cycleService->save($request, $project);

        return (new CycleResource($cycle))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Cycle $cycle): CycleResource
    {
        $cycle = $this->cycleService->get($cycle);

        return new CycleResource($cycle);
    }

    public function update(CycleUpdateRequest $request, Cycle $cycle): CycleResource
    {
        $cycle = $this->cycleService->update($request, $cycle);

        return new CycleResource($cycle);
    }

    public function complete(CycleCompleteRequest $request, Cycle $cycle): JsonResponse
    {
        $data = $request->validated();
        $transferTarget = $data['transfer_target'] ?? 'BACKLOG';
        $targetCycleId = $data['target_cycle_id'] ?? null;

        $completedCycle = $this->cycleService->completeCycle($cycle, $transferTarget, $targetCycleId);

        return response()->json([
            'message' => 'Ciclo finalizado con éxito',
            'data' => new CycleResource($completedCycle),
        ]);
    }

    public function analytics(Cycle $cycle): JsonResponse
    {
        $analytics = $this->cycleService->getAnalytics($cycle);

        return response()->json([
            'data' => $analytics,
        ]);
    }

    public function addWorkItems(Request $request, Cycle $cycle): JsonResponse
    {
        $request->validate([
            'work_item_ids' => ['required', 'array'],
            'work_item_ids.*' => ['exists:work_items,id'],
        ]);

        $cycle = $this->cycleService->addWorkItems($cycle, $request->work_item_ids);

        return response()->json([
            'message' => 'Work items vinculados al ciclo',
            'data' => new CycleResource($cycle),
        ]);
    }

    public function removeWorkItem(Cycle $cycle, WorkItem $workItem): JsonResponse
    {
        $this->cycleService->removeWorkItem($cycle, $workItem);

        return response()->json([
            'message' => 'Work item removido del ciclo',
        ]);
    }

    public function destroy(Cycle $cycle): JsonResponse
    {
        $this->cycleService->delete($cycle);

        return response()->json([
            'message' => 'Ciclo y sus work items asociados eliminados con éxito',
        ]);
    }
}
