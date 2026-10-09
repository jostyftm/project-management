<?php

namespace App\Services;

use App\Models\Page;
use App\Models\PageView;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PageService
{
    public function getTree(?int $projectId = null): Collection
    {
        $query = Page::query()
            ->whereNull('parent_id')
            ->with(['children.children.children', 'creator', 'lastEditor', 'project'])
            ->orderBy('order');

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        return $query->get();
    }

    public function list(Request $request, ?int $projectId = null): Collection
    {
        $query = Page::query()->with(['creator', 'lastEditor', 'project'])->orderByDesc('updated_at');

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        if ($request->has('is_published')) {
            $query->where('is_published', filter_var($request->input('is_published'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($search = $request->input('search')) {
            $query->where('title', 'like', "%{$search}%");
        }

        return $query->get();
    }

    public function get(Page $page): Page
    {
        return $page->load(['children', 'creator', 'lastEditor', 'project', 'parent']);
    }

    public function create(array $data): Page
    {
        $user = auth()->user();
        $workspaceId = $data['workspace_id'] ?? request()->header('X-Workspace-Id') ?? $user?->current_workspace_id;

        $initialBlocks = $data['content_json'] ?? [
            [
                'id' => (string) Str::uuid(),
                'type' => 'paragraph',
                'content' => '',
            ],
        ];

        // Max order for siblings
        $maxOrder = Page::where('workspace_id', $workspaceId)
            ->where('parent_id', $data['parent_id'] ?? null)
            ->max('order') ?? 0;

        return Page::create([
            'workspace_id' => $workspaceId,
            'project_id' => $data['project_id'] ?? null,
            'parent_id' => $data['parent_id'] ?? null,
            'title' => $data['title'] ?? 'Sin título',
            'content_json' => $initialBlocks,
            'is_published' => $data['is_published'] ?? false,
            'is_locked' => $data['is_locked'] ?? false,
            'access' => $data['access'] ?? 'WORKSPACE',
            'icon' => $data['icon'] ?? '📄',
            'color' => $data['color'] ?? null,
            'order' => $maxOrder + 1,
            'created_by' => $user?->id,
            'last_edited_by' => $user?->id,
        ]);
    }

    public function update(Page $page, array $data): Page
    {
        $user = auth()->user();

        // If page is locked and content update is attempted without unlocking
        if ($page->is_locked && ! ($data['is_locked'] ?? true)) {
            // Unlocking is permitted
        } elseif ($page->is_locked && isset($data['content_json']) && ! isset($data['is_locked'])) {
            abort(423, 'La página está bloqueada para edición.');
        }

        $page->fill($data);
        $page->last_edited_by = $user?->id;
        $page->save();

        return $page->load(['children', 'creator', 'lastEditor', 'project']);
    }

    public function delete(Page $page, ?User $user = null): void
    {
        $user = $user ?? auth()->user();

        if ($user) {
            $isInstanceAdmin = (bool) $user->is_instance_admin;
            $isWorkspaceOwner = $page->workspace && (int) $page->workspace->owner_id === (int) $user->id;

            if (! $isInstanceAdmin && ! $isWorkspaceOwner) {
                $isProjectAdmin = false;
                if ($page->project_id) {
                    $isProjectAdmin = ProjectMember::where('project_id', $page->project_id)
                        ->where('user_id', $user->id)
                        ->where('role', 'ADMIN')
                        ->exists();
                }

                if (! $isProjectAdmin) {
                    if ((int) $page->created_by !== (int) $user->id) {
                        abort(403, 'Solo puedes eliminar las páginas que tú has creado.');
                    }
                }
            }
        }

        $page->delete();
    }

    public function recordView(Page $page, ?int $userId, ?string $ip): void
    {
        $page->increment('views_count');

        PageView::create([
            'page_id' => $page->id,
            'user_id' => $userId,
            'ip_address' => $ip,
            'viewed_at' => now(),
        ]);
    }

    public function generateReport(int $projectId, string $templateType = 'executive_summary'): Page
    {
        $project = Project::findOrFail($projectId);
        $items = WorkItem::where('project_id', $projectId)->with('state')->get();

        $totalItems = $items->count();
        $completedItems = $items->filter(fn ($i) => $i->state?->group === 'COMPLETED')->count();
        $startedItems = $items->filter(fn ($i) => $i->state?->group === 'STARTED')->count();
        $backlogItems = $totalItems - $completedItems - $startedItems;
        $completionRate = $totalItems > 0 ? round(($completedItems / $totalItems) * 100, 1) : 0;

        $urgentItems = $items->filter(fn ($i) => in_array($i->priority, ['URGENT', 'HIGH']) && $i->state?->group !== 'COMPLETED');

        $blocks = [
            [
                'id' => (string) Str::uuid(),
                'type' => 'heading_1',
                'content' => "Reporte de Proyecto: {$project->name}",
            ],
            [
                'id' => (string) Str::uuid(),
                'type' => 'callout',
                'content' => "Estado general: {$completionRate}% completado. {$completedItems} de {$totalItems} tareas finalizadas. {$urgentItems->count()} incidencias prioritarias pendientes.",
                'calloutTone' => $completionRate > 70 ? 'success' : ($urgentItems->count() > 3 ? 'warning' : 'info'),
            ],
            [
                'id' => (string) Str::uuid(),
                'type' => 'heading_2',
                'content' => 'Desglose de Trabajo por Estado',
            ],
            [
                'id' => (string) Str::uuid(),
                'type' => 'table',
                'content' => '',
                'tableData' => [
                    ['Grupo de Estado', 'Cantidad', 'Porcentaje'],
                    ['Completadas', (string) $completedItems, "{$completionRate}%"],
                    ['En Progreso', (string) $startedItems, $totalItems > 0 ? round(($startedItems / $totalItems) * 100, 1).'%' : '0%'],
                    ['Pendientes / Backlog', (string) $backlogItems, $totalItems > 0 ? round(($backlogItems / $totalItems) * 100, 1).'%' : '0%'],
                ],
            ],
            [
                'id' => (string) Str::uuid(),
                'type' => 'heading_2',
                'content' => 'Items de Atención Urgente',
            ],
        ];

        if ($urgentItems->isEmpty()) {
            $blocks[] = [
                'id' => (string) Str::uuid(),
                'type' => 'paragraph',
                'content' => 'No hay tareas urgentes pendientes en este momento. ¡Excelente trabajo!',
            ];
        } else {
            foreach ($urgentItems->take(5) as $uItem) {
                $blocks[] = [
                    'id' => (string) Str::uuid(),
                    'type' => 'todo',
                    'content' => "[{$project->identifier}-{$uItem->sequence_id}] {$uItem->title} (Prioridad: {$uItem->priority})",
                    'checked' => false,
                ];
            }
        }

        $blocks[] = [
            'id' => (string) Str::uuid(),
            'type' => 'divider',
            'content' => '',
        ];

        $blocks[] = [
            'id' => (string) Str::uuid(),
            'type' => 'paragraph',
            'content' => 'Reporte generado automáticamente el '.now()->format('Y-m-d H:i').' mediante Knowledge Management Studio.',
        ];

        return $this->create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'title' => "Reporte de Estado — {$project->name} (".now()->format('M Y').')',
            'content_json' => $blocks,
            'icon' => '📊',
            'is_published' => true,
        ]);
    }
}
