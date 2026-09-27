<?php

namespace App\Http\Controllers\Api\v1\Initiative;

use App\Http\Controllers\Controller;
use App\Http\Requests\Initiative\InitiativeCreateRequest;
use App\Http\Resources\Initiative\InitiativeResource;
use App\Models\Initiative;
use App\Services\InitiativeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InitiativeController extends Controller
{
    public function __construct(
        protected InitiativeService $initiativeService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $initiatives = $this->initiativeService->list($request);
        return InitiativeResource::collection($initiatives);
    }

    public function store(InitiativeCreateRequest $request): JsonResponse
    {
        $initiative = $this->initiativeService->create($request->validated());
        return (new InitiativeResource($initiative))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Initiative $initiative): JsonResponse
    {
        $data = $this->initiativeService->get($initiative);
        return response()->json([
            'data' => (new InitiativeResource($data['initiative']))->toArray($request),
            'metrics' => $data['metrics'],
        ]);
    }

    public function update(Request $request, Initiative $initiative): InitiativeResource
    {
        $updated = $this->initiativeService->update($initiative, $request->all());
        return new InitiativeResource($updated);
    }

    public function destroy(Request $request, Initiative $initiative): JsonResponse
    {
        $this->initiativeService->delete($initiative);
        return response()->json(['message' => 'Iniciativa eliminada exitosamente']);
    }
}
