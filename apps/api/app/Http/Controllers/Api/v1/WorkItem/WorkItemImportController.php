<?php

namespace App\Http\Controllers\Api\v1\WorkItem;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\WorkItemImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class WorkItemImportController extends Controller
{
    public function __construct(
        protected WorkItemImportService $importService
    ) {}

    /**
     * Previsualiza un archivo CSV y sugiere mapeo de columnas.
     */
    public function preview(Request $request, Project $project): JsonResponse
    {
        $request->validate([
            'file' => 'nullable|file|mimes:csv,txt|max:5120',
            'csv_content' => 'nullable|string',
            'delimiter' => 'nullable|string|in:,,;,\\t',
        ]);

        $content = '';
        if ($request->hasFile('file')) {
            $content = file_get_contents($request->file('file')->getRealPath());
        } elseif ($request->filled('csv_content')) {
            $content = $request->input('csv_content');
        } else {
            return response()->json(['error' => 'Se requiere un archivo CSV o contenido de texto'], 422);
        }

        $result = $this->importService->preview($content, $request->input('delimiter'));

        return response()->json($result);
    }

    /**
     * Ejecuta la importación masiva de filas CSV con el mapeo seleccionado.
     */
    public function import(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'rows' => 'required|array|min:1',
            'column_mapping' => 'required|array',
        ]);

        $userId = auth()->id() ?? 1;

        $result = $this->importService->import(
            $project,
            $validated['rows'],
            $validated['column_mapping'],
            $userId
        );

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    /**
     * Descarga una plantilla CSV de ejemplo para el usuario.
     */
    public function downloadTemplate(): Response
    {
        $csv = $this->importService->generateSampleCsv();

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="plantilla_work_items.csv"',
        ]);
    }
}
