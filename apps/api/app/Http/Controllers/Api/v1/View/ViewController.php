<?php

namespace App\Http\Controllers\Api\v1\View;

use App\Http\Controllers\Controller;
use App\Http\Requests\View\ViewCreateRequest;
use App\Http\Requests\View\ViewUpdateRequest;
use App\Http\Resources\View\ViewResource;
use App\Models\Project;
use App\Models\View;
use App\Services\ViewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ViewController extends Controller
{
    public function __construct(
        protected ViewService $viewService
    ) {}

    public function index(Request $request, ?Project $project = null): AnonymousResourceCollection
    {
        $views = $this->viewService->list($request, $project);

        return ViewResource::collection($views);
    }

    public function store(ViewCreateRequest $request, ?Project $project = null): JsonResponse
    {
        $view = $this->viewService->save($request, $project);

        return (new ViewResource($view))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, View $view): ViewResource
    {
        $view = $this->viewService->get($view, $request->user()->id);

        return new ViewResource($view);
    }

    public function update(ViewUpdateRequest $request, View $view): ViewResource
    {
        $view = $this->viewService->update($request, $view);

        return new ViewResource($view);
    }

    public function destroy(Request $request, View $view): JsonResponse
    {
        $this->viewService->delete($view, $request->user()->id);

        return response()->json(['message' => 'Vista eliminada exitosamente']);
    }
}
