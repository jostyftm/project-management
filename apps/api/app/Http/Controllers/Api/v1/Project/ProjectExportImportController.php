<?php

namespace App\Http\Controllers\Api\v1\Project;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Workspace;
use App\Services\ProjectExportService;
use App\Services\ProjectImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class ProjectExportImportController extends Controller
{
    public function __construct(
        private ProjectExportService $exportService,
        private ProjectImportService $importService
    ) {}

    /**
     * Exporta la totalidad de la estructura del proyecto en formato JSON.
     */
    public function export(Request $request, Project $project): Response
    {
        $data = $this->exportService->export($project);
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $filename = "{$project->identifier}-export.json";

        return response($json, Response::HTTP_OK, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'X-Project-Identifier' => $project->identifier,
        ]);
    }

    /**
     * Importa un proyecto desde un archivo JSON o payload directo.
     */
    public function import(Request $request): JsonResponse
    {
        // 1. Resolver Workspace
        $workspace = null;
        if (app()->bound('current_workspace')) {
            $workspace = app('current_workspace');
        } elseif ($request->header('X-Workspace-Id')) {
            $workspace = Workspace::find($request->header('X-Workspace-Id'));
        } elseif ($request->header('X-Workspace-Slug')) {
            $workspace = Workspace::where('slug', $request->header('X-Workspace-Slug'))->first();
        } elseif ($request->has('workspace_id')) {
            $workspace = Workspace::find($request->input('workspace_id'));
        }

        if (! $workspace) {
            $user = $request->user();
            $workspace = $user ? ($user->workspaces()->first() ?? Workspace::where('owner_id', $user->id)->first()) : null;
        }

        if (! $workspace) {
            throw ValidationException::withMessages([
                'workspace' => ['Se requiere un workspace activo para importar el proyecto.'],
            ]);
        }

        // 2. Extraer datos JSON (de archivo subido o del cuerpo de la petición)
        $data = null;
        if ($request->hasFile('file')) {
            $uploadedFile = $request->file('file');
            if (! $uploadedFile->isValid()) {
                throw ValidationException::withMessages([
                    'file' => ['El archivo subido no es válido.'],
                ]);
            }
            $contents = file_get_contents($uploadedFile->getRealPath());
            $data = json_decode($contents, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw ValidationException::withMessages([
                    'file' => ['El archivo no contiene un formato JSON válido: '.json_last_error_msg()],
                ]);
            }
        } elseif ($request->has('data')) {
            $rawData = $request->input('data');
            $data = is_string($rawData) ? json_decode($rawData, true) : $rawData;
        } elseif ($request->isJson()) {
            $data = $request->json()->all();
        }

        if (empty($data) || ! is_array($data)) {
            throw ValidationException::withMessages([
                'file' => ['No se proporcionó un contenido JSON válido para importar.'],
            ]);
        }

        // 3. Opciones de anulación / sobreescritura
        $options = [
            'name' => $request->input('name'),
            'identifier' => $request->input('identifier'),
            'force' => filter_var($request->input('force', false), FILTER_VALIDATE_BOOLEAN),
        ];

        // 4. Procesar importación
        $result = $this->importService->import(
            data: $data,
            workspace: $workspace,
            actor: $request->user(),
            options: $options
        );

        return response()->json($result, Response::HTTP_CREATED);
    }
}
