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
        if ($request->has('start_date') || $request->has('end_date')) {
            return $this->history($request, $project);
        }

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

    /**
     * Obtiene el listado consolidado de Daily Standups con días trabajados por rango de fechas.
     */
    public function history(Request $request, Project $project): JsonResponse
    {
        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'cycle_id' => ['nullable', 'integer', 'exists:cycles,id'],
            'member_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $startDate = $request->start_date ? Carbon::parse($request->start_date) : null;
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : null;
        $cycleId = $request->cycle_id ? (int) $request->cycle_id : null;
        $memberId = $request->member_id ? (int) $request->member_id : null;

        $report = $this->standupService->generateRange($project, $startDate, $endDate, $cycleId, $memberId);

        return response()->json([
            'data' => $report,
        ]);
    }
}
