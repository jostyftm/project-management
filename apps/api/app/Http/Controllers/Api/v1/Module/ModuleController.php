<?php

namespace App\Http\Controllers\Api\v1\Module;

use App\Http\Controllers\Controller;
use App\Http\Requests\Module\ModuleCreateRequest;
use App\Http\Requests\Module\ModuleUpdateRequest;
use App\Http\Resources\Module\ModuleResource;
use App\Models\Module;
use App\Models\Project;
use App\Services\ModuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ModuleController extends Controller
{
    public function __construct(
        protected ModuleService $moduleService
    ) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $modules = $this->moduleService->list($request, $project);

        return ModuleResource::collection($modules);
    }

    public function store(ModuleCreateRequest $request, Project $project): JsonResponse
    {
        $module = $this->moduleService->save($request, $project);

        return (new ModuleResource($module))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Module $module): ModuleResource
    {
        $module = $this->moduleService->get($module);

        return new ModuleResource($module);
    }

    public function update(ModuleUpdateRequest $request, Module $module): ModuleResource
    {
        $module = $this->moduleService->update($request, $module);

        return new ModuleResource($module);
    }

    public function syncWorkItems(Request $request, Module $module): JsonResponse
    {
        $request->validate([
            'work_item_ids' => ['required', 'array'],
            'work_item_ids.*' => ['exists:work_items,id'],
        ]);

        $module = $this->moduleService->syncWorkItems($module, $request->work_item_ids);

        return response()->json([
            'message' => 'Work items sincronizados con el módulo',
            'data' => new ModuleResource($module),
        ]);
    }

    public function progress(Module $module): JsonResponse
    {
        $progress = $this->moduleService->getProgress($module);

        return response()->json([
            'data' => $progress,
        ]);
    }
}
