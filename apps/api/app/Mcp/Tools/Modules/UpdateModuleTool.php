<?php

namespace App\Mcp\Tools\Modules;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Module;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('update_module')]
#[Title('Actualizar Módulo')]
#[Description('Actualiza las propiedades de un módulo funcional: estado (ej: pasar a IN_PROGRESS o COMPLETED), responsable, nombre o fechas.')]
class UpdateModuleTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'module_id' => $schema->integer()
                ->description('ID numérico del módulo')
                ->required(),
            'name' => $schema->string()
                ->description('Nuevo nombre del módulo'),
            'description' => $schema->string()
                ->description('Nueva descripción del módulo'),
            'status' => $schema->string()
                ->enum(['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'])
                ->description('Nuevo estado del módulo'),
            'lead_id' => $schema->integer()
                ->description('ID del nuevo usuario responsable / líder'),
            'start_date' => $schema->string()
                ->description('Nueva fecha de inicio (YYYY-MM-DD)'),
            'target_date' => $schema->string()
                ->description('Nueva fecha objetivo (YYYY-MM-DD)'),
        ];
    }

    public function handle(Request $request): Response
    {
        $moduleId = (int) $request->get('module_id');
        $module = Module::find($moduleId);

        if (! $module) {
            return Response::error("Módulo con ID '{$moduleId}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $module->project, requiredRole: 'ADMIN')) {
            return $authError;
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $module->workspace_id);

        $updates = [];
        if ($name = $request->get('name')) {
            $updates['name'] = $name;
        }
        if ($request->has('description')) {
            $updates['description'] = $request->get('description');
        }
        if ($status = $request->get('status')) {
            $updates['status'] = strtoupper($status);
        }
        if ($request->has('lead_id')) {
            $updates['lead_id'] = $request->get('lead_id');
        }
        if ($request->has('start_date')) {
            $updates['start_date'] = $request->get('start_date');
        }
        if ($request->has('target_date')) {
            $updates['target_date'] = $request->get('target_date');
        }

        if (! empty($updates)) {
            $module->update($updates);
        }

        return Response::text($this->formatJson([
            'message' => "Módulo '{$module->name}' actualizado exitosamente.",
            'module' => [
                'id' => $module->id,
                'name' => $module->name,
                'status' => $module->status,
                'start_date' => $module->start_date?->format('Y-m-d'),
                'target_date' => $module->target_date?->format('Y-m-d'),
            ],
        ]));
    }
}
