<?php

namespace App\Mcp\Tools\Cycles;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Cycle;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('update_cycle')]
#[Title('Actualizar Ciclo / Sprint')]
#[Description('Actualiza un ciclo o sprint: cambia su estado (ej: pasar a CURRENT o COMPLETED), nombre, descripción o fechas de ejecución.')]
class UpdateCycleTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'cycle_id' => $schema->integer()
                ->description('ID numérico del ciclo / sprint')
                ->required(),
            'name' => $schema->string()
                ->description('Nuevo nombre del ciclo'),
            'description' => $schema->string()
                ->description('Nueva descripción u objetivos'),
            'status' => $schema->string()
                ->enum(['DRAFT', 'UPCOMING', 'CURRENT', 'COMPLETED'])
                ->description('Nuevo estado del ciclo'),
            'start_date' => $schema->string()
                ->description('Nueva fecha de inicio (YYYY-MM-DD)'),
            'end_date' => $schema->string()
                ->description('Nueva fecha de finalización (YYYY-MM-DD)'),
        ];
    }

    public function handle(Request $request): Response
    {
        $cycleId = (int) $request->get('cycle_id');
        $cycle = Cycle::find($cycleId);

        if (! $cycle) {
            return Response::error("Ciclo con ID '{$cycleId}' no encontrado.");
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $cycle->workspace_id);

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
        if ($request->has('start_date')) {
            $updates['start_date'] = $request->get('start_date');
        }
        if ($request->has('end_date')) {
            $updates['end_date'] = $request->get('end_date');
        }

        if (! empty($updates)) {
            $cycle->update($updates);
        }

        return Response::text($this->formatJson([
            'message' => "Ciclo '{$cycle->name}' actualizado exitosamente.",
            'cycle' => [
                'id' => $cycle->id,
                'name' => $cycle->name,
                'status' => $cycle->status,
                'start_date' => $cycle->start_date?->format('Y-m-d'),
                'end_date' => $cycle->end_date?->format('Y-m-d'),
            ],
        ]));
    }
}
