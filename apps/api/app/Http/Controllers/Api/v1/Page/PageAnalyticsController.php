<?php

namespace App\Http\Controllers\Api\v1\Page;

use App\Http\Controllers\Controller;
use App\Http\Resources\Page\PageAnalyticsResource;
use App\Models\Page;
use App\Services\PageAnalyticsService;
use App\Services\PageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PageAnalyticsController extends Controller
{
    public function __construct(
        protected PageAnalyticsService $analyticsService,
        protected PageService $pageService
    ) {}

    public function recordView(Request $request, Page $page): JsonResponse
    {
        $this->pageService->recordView($page, $request->user()?->id, $request->ip());

        return response()->json([
            'message' => 'Visualización registrada',
            'views_count' => $page->views_count,
        ]);
    }

    public function show(Request $request, Page $page): PageAnalyticsResource
    {
        $analytics = $this->analyticsService->getAnalytics($page);

        return new PageAnalyticsResource($analytics);
    }
}
