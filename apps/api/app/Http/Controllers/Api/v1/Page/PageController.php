<?php

namespace App\Http\Controllers\Api\v1\Page;

use App\Http\Controllers\Controller;
use App\Http\Requests\Page\PageCreateRequest;
use App\Http\Requests\Page\PageUpdateRequest;
use App\Http\Resources\Page\PageResource;
use App\Http\Resources\Page\PageTreeResource;
use App\Models\Page;
use App\Models\Project;
use App\Services\PageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PageController extends Controller
{
    public function __construct(
        protected PageService $pageService
    ) {}

    public function index(Request $request, ?Project $project = null): AnonymousResourceCollection
    {
        $pages = $this->pageService->list($request, $project?->id);
        return PageResource::collection($pages);
    }

    public function tree(Request $request, ?Project $project = null): AnonymousResourceCollection
    {
        $tree = $this->pageService->getTree($project?->id);
        return PageTreeResource::collection($tree);
    }

    public function store(PageCreateRequest $request, ?Project $project = null): JsonResponse
    {
        $data = $request->validated();
        if ($project) {
            $data['project_id'] = $project->id;
        }

        $page = $this->pageService->create($data);
        return (new PageResource($page))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Page $page): PageResource
    {
        $loaded = $this->pageService->get($page);
        return new PageResource($loaded);
    }

    public function update(PageUpdateRequest $request, Page $page): PageResource
    {
        $updated = $this->pageService->update($page, $request->validated());
        return new PageResource($updated);
    }

    public function destroy(Request $request, Page $page): JsonResponse
    {
        $this->pageService->delete($page, $request->user());
        return response()->json(['message' => 'Página eliminada exitosamente']);
    }

    public function generateReport(Request $request): JsonResponse
    {
        $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
        ]);

        $page = $this->pageService->generateReport((int) $request->input('project_id'));
        return (new PageResource($page))
            ->response()
            ->setStatusCode(201);
    }
}
