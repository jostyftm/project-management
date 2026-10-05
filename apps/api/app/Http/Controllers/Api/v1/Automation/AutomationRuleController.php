<?php

namespace App\Http\Controllers\Api\v1\Automation;

use App\Http\Controllers\Controller;
use App\Models\AutomationRule;
use App\Models\Project;
use App\Services\AutomationRuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationRuleController extends Controller
{
    public function __construct(
        protected AutomationRuleService $ruleService
    ) {}

    public function index(Project $project): JsonResponse
    {
        $rules = $this->ruleService->listByProject($project->id);
        return response()->json($rules);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'trigger_event' => 'required|string|max:64',
            'trigger_conditions' => 'nullable|array',
            'actions' => 'required|array',
            'is_active' => 'boolean',
        ]);

        $rule = $this->ruleService->create($project, $validated);

        return response()->json($rule, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $rule = AutomationRule::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'trigger_event' => 'sometimes|string|max:64',
            'trigger_conditions' => 'nullable|array',
            'actions' => 'sometimes|array',
            'is_active' => 'sometimes|boolean',
        ]);

        $rule->update($validated);

        return response()->json($rule);
    }

    public function destroy(int $id): JsonResponse
    {
        $rule = AutomationRule::findOrFail($id);
        $rule->delete();

        return response()->json(['message' => 'Regla de automatización eliminada']);
    }

    public function testRule(int $id): JsonResponse
    {
        $rule = AutomationRule::findOrFail($id);
        $appliedCount = $this->ruleService->evaluateAndExecute($rule);

        return response()->json([
            'message' => "Regla evaluada. Se aplicó sobre {$appliedCount} work items.",
            'applied_count' => $appliedCount,
        ]);
    }
}
