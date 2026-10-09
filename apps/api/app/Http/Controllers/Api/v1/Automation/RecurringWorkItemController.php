<?php

namespace App\Http\Controllers\Api\v1\Automation;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\RecurringWorkItem;
use App\Services\RecurringWorkItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecurringWorkItemController extends Controller
{
    public function __construct(
        protected RecurringWorkItemService $recurringService
    ) {}

    public function index(Project $project): JsonResponse
    {
        $items = $this->recurringService->listByProject($project->id);

        return response()->json($items);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'frequency' => 'required|string|in:DAILY,WEEKLY,MONTHLY,CUSTOM',
            'cron_expression' => 'nullable|string',
            'work_item_template' => 'required|array',
            'work_item_template.title' => 'required|string|max:255',
            'is_active' => 'boolean',
        ]);

        $userId = auth()->id() ?? 1;

        $recurring = $this->recurringService->create($project, $validated, $userId);

        return response()->json($recurring, 201);
    }

    public function executeNow(int $id): JsonResponse
    {
        $recurring = RecurringWorkItem::with('project')->findOrFail($id);
        $workItem = $this->recurringService->executeNow($recurring);

        return response()->json([
            'message' => 'Tarea periódica ejecutada exitosamente',
            'work_item' => $workItem,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $recurring = RecurringWorkItem::findOrFail($id);
        $recurring->delete();

        return response()->json(['message' => 'Plantilla periódica eliminada']);
    }
}
