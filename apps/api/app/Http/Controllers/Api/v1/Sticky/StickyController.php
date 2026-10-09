<?php

namespace App\Http\Controllers\Api\v1\Sticky;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sticky\StickyCreateRequest;
use App\Http\Resources\Sticky\StickyResource;
use App\Models\Sticky;
use App\Services\StickyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StickyController extends Controller
{
    public function __construct(
        protected StickyService $stickyService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $stickies = $this->stickyService->list($request);

        return StickyResource::collection($stickies);
    }

    public function store(StickyCreateRequest $request): JsonResponse
    {
        $sticky = $this->stickyService->create($request->validated());

        return (new StickyResource($sticky))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Sticky $sticky): StickyResource
    {
        $updated = $this->stickyService->update($sticky, $request->all());

        return new StickyResource($updated);
    }

    public function togglePin(Sticky $sticky): StickyResource
    {
        $updated = $this->stickyService->togglePin($sticky);

        return new StickyResource($updated);
    }

    public function togglePrivacy(Sticky $sticky): StickyResource
    {
        $updated = $this->stickyService->togglePrivacy($sticky);

        return new StickyResource($updated);
    }

    public function destroy(Sticky $sticky): JsonResponse
    {
        $this->stickyService->delete($sticky);

        return response()->json(['message' => 'Nota adhesiva eliminada']);
    }
}
