<?php

namespace App\Http\Controllers\Api\v1\WorkItemType;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkItemType\WorkItemTypeCreateRequest;
use App\Http\Resources\WorkItemType\WorkItemTypeResource;
use App\Models\Project;
use App\Services\WorkItemTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WorkItemTypeController extends Controller
{
    public function __construct(
        protected WorkItemTypeService $typeService
    ) {}

    public function index(Request $request, ?Project $project = null): AnonymousResourceCollection
    {
        $types = $this->typeService->list($request, $project);
        return WorkItemTypeResource::collection($types);
    }

    public function store(WorkItemTypeCreateRequest $request, ?Project $project = null): JsonResponse
    {
        $type = $this->typeService->save($request, $project);
        return (new WorkItemTypeResource($type))
            ->response()
            ->setStatusCode(201);
    }
}
