<?php

namespace App\Http\Controllers\Api\v1\YourWork;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkItem\WorkItemResource;
use App\Services\YourWorkService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class YourWorkController extends Controller
{
    public function __construct(
        protected YourWorkService $yourWorkService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = $this->yourWorkService->getItems($request);
        return WorkItemResource::collection($items);
    }
}
