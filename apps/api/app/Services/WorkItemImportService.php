<?php

namespace App\Services;

use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemType;
use Illuminate\Support\Facades\DB;

class WorkItemImportService
{
    /**
     * Previsualiza un archivo CSV detectando su delimitador y sugiriendo el mapeo de columnas.
     */
    public function preview(string $content, ?string $delimiter = null): array
    {
        // Limpiar BOM UTF-8 si existe
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $lines = preg_split('/\r\n|\r|\n/', trim($content));

        if (empty($lines)) {
            return [
                'headers' => [],
                'sample_rows' => [],
                'total_rows' => 0,
                'delimiter' => ',',
                'suggested_mapping' => [],
            ];
        }

        // Auto-detectar delimitador si no se especificó
        if (!$delimiter) {
            $firstLine = $lines[0];
            $commas = substr_count($firstLine, ',');
            $semicolons = substr_count($firstLine, ';');
            $tabs = substr_count($firstLine, "\t");

            if ($semicolons > $commas && $semicolons > $tabs) {
                $delimiter = ';';
            } elseif ($tabs > $commas && $tabs > $semicolons) {
                $delimiter = "\t";
            } else {
                $delimiter = ',';
            }
        }

        $headers = str_getcsv($lines[0], $delimiter);
        $headers = array_map('trim', $headers);

        $sampleRows = [];
        $totalRows = 0;

        for ($i = 1; $i < count($lines); $i++) {
            $line = trim($lines[$i]);
            if ($line === '') continue;

            $totalRows++;
            if (count($sampleRows) < 5) {
                $row = str_getcsv($line, $delimiter);
                $rowAssoc = [];
                foreach ($headers as $idx => $header) {
                    $rowAssoc[$header] = $row[$idx] ?? '';
                }
                $sampleRows[] = $rowAssoc;
            }
        }

        $suggestedMapping = $this->suggestMapping($headers);

        return [
            'headers' => $headers,
            'sample_rows' => $sampleRows,
            'total_rows' => $totalRows,
            'delimiter' => $delimiter,
            'suggested_mapping' => $suggestedMapping,
        ];
    }

    /**
     * Importa las filas del CSV en el proyecto dentro de una transacción atómica.
     */
    public function import(Project $project, array $rows, array $columnMapping, int $userId): array
    {
        $project->loadMissing(['states', 'workItemTypes']);

        $defaultState = $project->states()->where('is_default', true)->first()
            ?? $project->states()->orderBy('sequence')->first();

        $defaultType = $project->workItemTypes()->first()
            ?? WorkItemType::firstOrCreate(['name' => 'Tarea', 'workspace_id' => $project->workspace_id]);

        $statesByName = $project->states->keyBy(fn ($s) => mb_strtolower($s->name));
        $typesByName = $project->workItemTypes->keyBy(fn ($t) => mb_strtolower($t->name));
        $usersByEmail = User::all()->keyBy(fn ($u) => mb_strtolower($u->email));

        // Obtener el siguiente sequence_id
        $lastSeq = WorkItem::where('project_id', $project->id)->max('sequence_id') ?? 0;

        $imported = 0;
        $errors = [];

        DB::transaction(function () use (
            $project,
            $rows,
            $columnMapping,
            $userId,
            $defaultState,
            $defaultType,
            $statesByName,
            $typesByName,
            $usersByEmail,
            &$lastSeq,
            &$imported,
            &$errors
        ) {
            foreach ($rows as $index => $row) {
                $titleCol = $columnMapping['title'] ?? null;
                $title = trim($row[$titleCol] ?? '');

                if ($title === '') {
                    $errors[] = "Fila " . ($index + 1) . ": Título vacío, omitida.";
                    continue;
                }

                // Descripción
                $descCol = $columnMapping['description'] ?? null;
                $descText = trim($row[$descCol] ?? '');
                $descJson = $descText ? [
                    'type' => 'doc',
                    'content' => [
                        [
                            'type' => 'paragraph',
                            'content' => [['type' => 'text', 'text' => $descText]],
                        ],
                    ],
                ] : null;

                // Prioridad (URGENT, HIGH, MEDIUM, LOW, NONE)
                $priorityCol = $columnMapping['priority'] ?? null;
                $priorityRaw = strtoupper(trim($row[$priorityCol] ?? 'NONE'));
                $priority = in_array($priorityRaw, ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'])
                    ? $priorityRaw
                    : 'NONE';

                // Estado
                $stateCol = $columnMapping['state'] ?? null;
                $stateRaw = mb_strtolower(trim($row[$stateCol] ?? ''));
                $state = $statesByName->get($stateRaw, $defaultState);

                // Tipo
                $typeCol = $columnMapping['type'] ?? null;
                $typeRaw = mb_strtolower(trim($row[$typeCol] ?? ''));
                $type = $typesByName->get($typeRaw, $defaultType);

                // Estimación
                $pointsCol = $columnMapping['estimate_points'] ?? null;
                $points = isset($row[$pointsCol]) && is_numeric($row[$pointsCol])
                    ? (float) $row[$pointsCol]
                    : null;

                // Asignado
                $assigneeCol = $columnMapping['assignee'] ?? null;
                $assigneeEmail = mb_strtolower(trim($row[$assigneeCol] ?? ''));
                $assignee = $usersByEmail->get($assigneeEmail);

                $lastSeq++;

                $item = WorkItem::create([
                    'workspace_id' => $project->workspace_id,
                    'project_id' => $project->id,
                    'sequence_id' => $lastSeq,
                    'title' => $title,
                    'description_json' => $descJson,
                    'priority' => $priority,
                    'state_id' => $state?->id,
                    'type_id' => $type?->id,
                    'estimate_points' => $points,
                    'lead_id' => $assignee?->id,
                    'created_by' => $userId,
                    'is_draft' => false,
                ]);

                if ($assignee) {
                    $item->assignees()->attach($assignee->id);
                }

                $imported++;
            }
        });

        return [
            'success' => true,
            'imported_count' => $imported,
            'errors' => $errors,
        ];
    }

    /**
     * Genera una plantilla CSV estándar descargable.
     */
    public function generateSampleCsv(): string
    {
        $headers = ['Título', 'Descripción', 'Prioridad', 'Estado', 'Tipo', 'Estimación', 'Asignado (Email)'];
        $sampleData = [
            ['Configurar pipeline de CI/CD', 'Implementar GitHub Actions para test y build', 'HIGH', 'En Progreso', 'Tarea', '3', 'dev@ejemplo.com'],
            ['Diseñar pantalla de login', 'Crear componentes UI y formulario accesible', 'MEDIUM', 'Por Hacer', 'Historia', '2', 'ui@ejemplo.com'],
            ['Optimizar consultas SQL en reportes', 'Agregar índices en tablas de analíticas', 'LOW', 'Backlog', 'Mejora', '1', ''],
        ];

        $output = fopen('php://temp', 'r+');
        fputcsv($output, $headers);
        foreach ($sampleData as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv ?: '';
    }

    /**
     * Sugiere mapeos de columnas estándar basados en nombres de cabecera.
     */
    private function suggestMapping(array $headers): array
    {
        $mapping = [];
        foreach ($headers as $header) {
            $norm = mb_strtolower(trim($header));

            if (!isset($mapping['title']) && in_array($norm, ['título', 'titulo', 'title', 'nombre', 'name', 'resumen', 'summary'])) {
                $mapping['title'] = $header;
            } elseif (!isset($mapping['description']) && in_array($norm, ['descripción', 'descripcion', 'description', 'desc', 'detalle'])) {
                $mapping['description'] = $header;
            } elseif (!isset($mapping['priority']) && in_array($norm, ['prioridad', 'priority'])) {
                $mapping['priority'] = $header;
            } elseif (!isset($mapping['state']) && in_array($norm, ['estado', 'state', 'status'])) {
                $mapping['state'] = $header;
            } elseif (!isset($mapping['type']) && in_array($norm, ['tipo', 'type', 'issue_type'])) {
                $mapping['type'] = $header;
            } elseif (!isset($mapping['estimate_points']) && in_array($norm, ['estimación', 'estimacion', 'estimate', 'points', 'puntos'])) {
                $mapping['estimate_points'] = $header;
            } elseif (!isset($mapping['assignee']) && in_array($norm, ['asignado', 'assignee', 'responsable', 'email', 'owner'])) {
                $mapping['assignee'] = $header;
            }
        }
        return $mapping;
    }
}
