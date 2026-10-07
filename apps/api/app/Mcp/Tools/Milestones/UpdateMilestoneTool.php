<?php

namespace App\Mcp\Tools\Milestones;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Milestone;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('update_milestone')]
#[Title('Actualizar Hito (Milestone)')]
#[Description('Actualiza las propiedades de un hito: cambiar su estado (ej: marcar como COMPLETED), descripción o reprogramar su fecha objetivo.')]
class UpdateMilestoneTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'milestone_id' => $schema->integer()
                ->description('ID numérico del hito')
                ->required(),
            'title' => $schema->string()
                ->description('Nuevo título del hito'),
            'description' => $schema->string()
                ->description('Nueva descripción'),
            'status' => $schema->string()
                ->enum(['OPEN', 'COMPLETED', 'CANCELLED'])
                ->description('Nuevo estado del hito'),
            'target_date' => $schema->string()
                ->description('Nueva fecha objetivo (YYYY-MM-DD)'),
        ];
    }

    public function handle(Request $request): Response
    {
        $milestoneId = (int) $request->get('milestone_id');
        $milestone = Milestone::find($milestoneId);

        if (! $milestone) {
            return Response::error("Hito con ID '{$milestoneId}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $milestone->project, requiredRole: 'ADMIN')) {
            return $authError;
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $milestone->workspace_id);

        $updates = [];
        if ($title = $request->get('title')) {
            $updates['title'] = $title;
        }
        if ($request->has('description')) {
            $updates['description'] = $request->get('description');
        }
        if ($status = $request->get('status')) {
            $updates['status'] = strtoupper($status);
            if ($updates['status'] === 'COMPLETED' && ! $milestone->completed_at) {
                $updates['completed_at'] = now();
            } elseif ($updates['status'] !== 'COMPLETED') {
                $updates['completed_at'] = null;
            }
        }
        if ($request->has('target_date')) {
            $updates['target_date'] = $request->get('target_date');
        }

        if (! empty($updates)) {
            $milestone->update($updates);
        }

        return Response::text($this->formatJson([
            'message' => "Hito '{$milestone->title}' actualizado exitosamente.",
            'milestone' => [
                'id' => $milestone->id,
                'title' => $milestone->title,
                'status' => $milestone->status,
                'target_date' => $milestone->target_date?->format('Y-m-d'),
                'completed_at' => $milestone->completed_at?->toIso8601String(),
            ],
        ]));
    }
}
