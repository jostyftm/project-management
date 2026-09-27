<?php

namespace App\Http\Controllers\Api\v1\Activity;

use App\Http\Controllers\Controller;
use App\Http\Resources\Activity\ActivityResource;
use App\Services\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityController extends Controller
{
    public function __construct(
        protected ActivityService $activityService
    ) {}

    public function indexByWorkItem(Request $request, string|int $workItemId): AnonymousResourceCollection
    {
        $activities = $this->activityService->listForWorkItem($workItemId);
        return ActivityResource::collection($activities);
    }

    public function indexByProject(Request $request, string|int $projectId): AnonymousResourceCollection
    {
        $activities = $this->activityService->listForProject($projectId);
        return ActivityResource::collection($activities);
    }
}
