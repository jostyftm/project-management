<?php

namespace App\Mcp\Tools\Projects;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Label;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\WorkspaceMember;
use App\Services\WorkItemTypeService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('create_project')]
#[Title('Crear Nuevo Proyecto')]
#[Description('Crea un nuevo proyecto en el workspace, inicializando automáticamente los estados, tipos de tareas y etiquetas por defecto.')]
class CreateProjectTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'name' => $schema->string()
                ->description('Nombre del proyecto (ej: "Plataforma Core")')
                ->required(),
            'identifier' => $schema->string()
                ->description('Identificador único o prefijo de clave (ej: "ENG", máx 12 caracteres)')
                ->required(),
            'description' => $schema->string()
                ->description('Descripción opcional de los objetivos del proyecto'),
            'workspace_id' => $schema->integer()
                ->description('ID opcional del workspace. Si se omite, se utiliza el workspace activo.'),
            'estimate_system' => $schema->string()
                ->enum(['FIBONACCI', 'TSHIRT', 'NUMERIC', 'NONE'])
                ->description('Sistema de estimación de esfuerzo del proyecto.')
                ->default('FIBONACCI'),
        ];
    }

    public function handle(Request $request): Response
    {
        $workspace = $this->resolveWorkspace($request, $request->get('workspace_id'));

        if (! $workspace) {
            return Response::error('No se pudo determinar el workspace activo.');
        }

        $user = $this->resolveUser($request);
        if (! $user) {
            return Response::error('No se pudo determinar el usuario para la creación del proyecto.');
        }

        $wsMember = WorkspaceMember::where('workspace_id', $workspace->id)
            ->where('user_id', $user->id)
            ->first();

        if ($wsMember && $wsMember->role === 'GUEST') {
            return Response::error('Los usuarios con rol de Invitado (GUEST) no tienen permisos para crear proyectos.');
        }

        $identifier = strtoupper(trim((string) $request->get('identifier')));

        $exists = Project::where('workspace_id', $workspace->id)
            ->where('identifier', $identifier)
            ->exists();

        if ($exists) {
            return Response::error("Ya existe un proyecto con el identificador '{$identifier}' en este workspace.");
        }

        $project = DB::transaction(function () use ($request, $workspace, $user, $identifier) {
            $project = Project::create([
                'workspace_id' => $workspace->id,
                'name' => trim((string) $request->get('name')),
                'identifier' => $identifier,
                'description' => $request->get('description'),
                'icon' => '📁',
                'lead_id' => $user->id,
                'estimate_system' => $request->get('estimate_system', 'FIBONACCI'),
            ]);

            ProjectMember::create([
                'project_id' => $project->id,
                'user_id' => $user->id,
                'role' => 'ADMIN',
            ]);

            $defaultStates = [
                ['name' => 'Backlog', 'color' => '#94A3B8', 'group' => 'BACKLOG', 'sequence' => 0, 'is_default' => true],
                ['name' => 'To Do', 'color' => '#60A5FA', 'group' => 'UNSTARTED', 'sequence' => 1, 'is_default' => true],
                ['name' => 'In Progress', 'color' => '#F59E0B', 'group' => 'STARTED', 'sequence' => 2, 'is_default' => true],
                ['name' => 'Done', 'color' => '#10B981', 'group' => 'COMPLETED', 'sequence' => 3, 'is_default' => true],
                ['name' => 'Cancelled', 'color' => '#EF4444', 'group' => 'CANCELLED', 'sequence' => 4, 'is_default' => true],
            ];

            foreach ($defaultStates as $st) {
                State::create(array_merge($st, [
                    'workspace_id' => $workspace->id,
                    'project_id' => $project->id,
                ]));
            }

            $defaultLabels = [
                ['name' => 'Bug', 'color' => '#EF4444', 'description' => 'Incidencias y errores'],
                ['name' => 'Feature', 'color' => '#8B5CF6', 'description' => 'Nueva funcionalidad'],
                ['name' => 'Improvement', 'color' => '#3B82F6', 'description' => 'Mejoras y refactor'],
            ];

            foreach ($defaultLabels as $lb) {
                Label::create(array_merge($lb, [
                    'workspace_id' => $workspace->id,
                    'project_id' => $project->id,
                ]));
            }

            (new WorkItemTypeService)->seedDefaultTypes($project);

            return $project->load(['states', 'labels', 'lead']);
        });

        return Response::text($this->formatJson([
            'message' => "Proyecto '{$project->name}' ({$project->identifier}) creado exitosamente.",
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'identifier' => $project->identifier,
                'description' => $project->description,
                'estimate_system' => $project->estimate_system,
                'states_count' => $project->states->count(),
                'labels_count' => $project->labels->count(),
            ],
        ]));
    }
}
