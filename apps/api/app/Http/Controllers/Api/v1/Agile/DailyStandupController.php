<?php

namespace App\Http\Controllers\Api\v1\Agile;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\Agile\DailyStandupService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyStandupController extends Controller
{
    public function __construct(
        protected DailyStandupService $standupService
    ) {}

    /**
     * Obtiene el resumen automático de Daily Standup para los miembros de un proyecto.
     */
    public function show(Request $request, Project $project): JsonResponse
    {
        $request->validate([
            'date' => ['nullable', 'date'],
            'cycle_id' => ['nullable', 'integer', 'exists:cycles,id'],
        ]);

        $date = $request->date ? Carbon::parse($request->date) : null;
        $cycleId = $request->cycle_id ? (int) $request->cycle_id : null;

        $standupData = $this->standupService->generate($project, $date, $cycleId);

        return response()->json([
            'data' => $standupData,
        ]);
    }
}
