<?php

namespace App\Http\Middleware;

use App\Models\AutomationRule;
use App\Models\Cycle;
use App\Models\Milestone;
use App\Models\Module;
use App\Models\Page;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\RecurringWorkItem;
use App\Models\Release;
use App\Models\WorkItem;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthorizeProjectAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string|null  $requiredRole  ('admin' or null)
     */
    public function handle(Request $request, Closure $next, ?string $requiredRole = null): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(404, 'Proyecto no encontrado.');
        }

        $project = $this->resolveProject($request);

        if (! $project) {
            // Si la ruta especificaba un identificador de proyecto pero no se encontró, responder 404
            if ($this->hasProjectIdentifierInRoute($request)) {
                abort(404, 'Proyecto no encontrado.');
            }

            return $next($request);
        }

        // 1. Superadministrador de la instancia
        if ($user->is_instance_admin) {
            $request->attributes->set('current_project', $project);
            $request->attributes->set('current_project_role', 'ADMIN');

            return $next($request);
        }

        // 2. Dueño del workspace
        if ($project->workspace && (int) $project->workspace->owner_id === (int) $user->id) {
            $request->attributes->set('current_project', $project);
            $request->attributes->set('current_project_role', 'ADMIN');

            return $next($request);
        }

        // 3. Miembro registrado en project_members
        $member = ProjectMember::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $member) {
            // Seguridad por diseño: 404 para no divulgar la existencia del proyecto
            abort(404, 'Proyecto no encontrado.');
        }

        // Registrar rol y proyecto en los atributos de la petición
        $request->attributes->set('current_project', $project);
        $request->attributes->set('current_project_role', $member->role);

        // 4. Validación de rol requerido (ej. 'admin')
        if ($requiredRole === 'admin') {
            if ($member->role !== 'ADMIN') {
                // Seguridad: 404 para no divulgar la existencia de recursos reservados a administradores
                abort(404, 'Recurso no encontrado.');
            }
        }

        return $next($request);
    }

    /**
     * Resuelve la instancia de Project a partir de los parámetros de la ruta.
     */
    protected function resolveProject(Request $request): ?Project
    {
        // 1. Parámetro directo {project}
        $projectParam = $request->route('project');
        if ($projectParam) {
            return $projectParam instanceof Project
                ? $projectParam
                : Project::find($projectParam);
        }

        // 2. Parámetro {work_item}
        $workItemParam = $request->route('work_item');
        if ($workItemParam) {
            $item = $workItemParam instanceof WorkItem
                ? $workItemParam
                : WorkItem::find($workItemParam);

            return $item?->project;
        }

        // 3. Parámetro {cycle}
        $cycleParam = $request->route('cycle');
        if ($cycleParam) {
            $cycle = $cycleParam instanceof Cycle
                ? $cycleParam
                : Cycle::find($cycleParam);

            return $cycle?->project;
        }

        // 4. Parámetro {module}
        $moduleParam = $request->route('module');
        if ($moduleParam) {
            $module = $moduleParam instanceof Module
                ? $moduleParam
                : Module::find($moduleParam);

            return $module?->project;
        }

        // 5. Parámetro {milestone}
        $milestoneParam = $request->route('milestone');
        if ($milestoneParam) {
            $milestone = $milestoneParam instanceof Milestone
                ? $milestoneParam
                : Milestone::find($milestoneParam);

            return $milestone?->project;
        }

        // 6. Parámetro {release}
        $releaseParam = $request->route('release');
        if ($releaseParam) {
            $release = $releaseParam instanceof Release
                ? $releaseParam
                : Release::find($releaseParam);

            return $release?->project;
        }

        // 7. Parámetro {page} (si está asociada a un proyecto)
        $pageParam = $request->route('page');
        if ($pageParam) {
            $page = $pageParam instanceof Page
                ? $pageParam
                : Page::find($pageParam);

            if ($page && $page->project_id) {
                return $page->project;
            }
        }

        // 8. Tareas recurrentes o Reglas de automatización por {id}
        $idParam = $request->route('id');
        if ($idParam) {
            $path = $request->path();
            if (str_contains($path, 'recurring-work-items')) {
                return RecurringWorkItem::find($idParam)?->project;
            }
            if (str_contains($path, 'automation-rules')) {
                return AutomationRule::find($idParam)?->project;
            }
        }

        return null;
    }

    /**
     * Determina si la ruta actual hace referencia a un proyecto o recurso dependiente.
     */
    protected function hasProjectIdentifierInRoute(Request $request): bool
    {
        return $request->route('project') !== null
            || $request->route('work_item') !== null
            || $request->route('cycle') !== null
            || $request->route('module') !== null
            || $request->route('milestone') !== null
            || $request->route('release') !== null;
    }
}
