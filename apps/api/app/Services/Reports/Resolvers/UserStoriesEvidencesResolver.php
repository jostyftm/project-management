<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Carbon\Carbon;

class UserStoriesEvidencesResolver
{
    /**
     * Resuelve historias de usuario con estructura nested (sub-historias/subtareas) y evidencias.
     * Config: { project_ids: [], cycle_ids: [], start_date: string, end_date: string, limit: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []);
        $cycleIds = ! empty($config['cycle_ids']) ? (array) $config['cycle_ids'] : (! empty($scope['cycle_ids']) ? (array) $scope['cycle_ids'] : []);
        $startDate = $config['start_date'] ?? $scope['start_date'] ?? null;
        $endDate = $config['end_date'] ?? $scope['end_date'] ?? null;
        $limit = min(max((int) ($config['limit'] ?? 20), 1), 50);

        $query = WorkItem::query()
            ->with([
                'project',
                'state',
                'type',
                'lead',
                'assignees',
                'deliverables.creator',
                'subItems.state',
                'subItems.type',
                'subItems.lead',
                'subItems.assignees',
                'subItems.deliverables.creator',
            ])
            ->whereNull('parent_id'); // Historias principales / raíz

        // Filtrar por proyectos
        if (! empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $query->whereHas('project', fn ($q) => $q->where('workspace_id', $scope['workspace_id']));
        }

        // Filtrar por ciclos
        if (! empty($cycleIds)) {
            $query->whereHas('cycles', fn ($q) => $q->whereIn('cycles.id', $cycleIds));
        }

        // Filtrar por rango de fechas
        if (! empty($startDate)) {
            $query->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
        }
        if (! empty($endDate)) {
            $query->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
        }

        // Priorizar tipos que coincidan con Historias / Features si existen
        $hasStoryTypes = WorkItem::whereHas('type', function ($q) {
            $q->where('name', 'LIKE', '%historia%')
                ->orWhere('name', 'LIKE', '%story%')
                ->orWhere('name', 'LIKE', '%feature%')
                ->orWhere('name', 'LIKE', '%característica%');
        })->exists();

        if ($hasStoryTypes) {
            $query->where(function ($q) {
                $q->whereHas('type', function ($t) {
                    $t->where('name', 'LIKE', '%historia%')
                        ->orWhere('name', 'LIKE', '%story%')
                        ->orWhere('name', 'LIKE', '%feature%')
                        ->orWhere('name', 'LIKE', '%característica%');
                })->orWhereHas('subItems');
            });
        }

        $items = $query->orderBy('sort_order', 'asc')->latest()->take($limit)->get();

        $formattedStories = $items->map(function ($item) {
            return $this->formatStory($item);
        })->values()->all();

        // Conteo total de evidencias
        $totalDeliverables = 0;
        $totalImages = 0;
        $totalPdfs = 0;

        foreach ($formattedStories as $story) {
            $totalDeliverables += count($story['evidences']['all']);
            $totalImages += count($story['evidences']['images']);
            $totalPdfs += count($story['evidences']['pdfs']);

            foreach ($story['sub_stories'] as $sub) {
                $totalDeliverables += count($sub['evidences']['all']);
                $totalImages += count($sub['evidences']['images']);
                $totalPdfs += count($sub['evidences']['pdfs']);
            }
        }

        return [
            'stories' => $formattedStories,
            'total_stories' => count($formattedStories),
            'summary' => [
                'total_deliverables' => $totalDeliverables,
                'total_images' => $totalImages,
                'total_pdfs' => $totalPdfs,
            ],
            'filters_applied' => [
                'project_ids' => $projectIds,
                'cycle_ids' => $cycleIds,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ];
    }

    /**
     * Formatea una historia de usuario y sus evidencias clasificadas.
     */
    protected function formatStory(WorkItem $item): array
    {
        $evidences = $this->classifyDeliverables($item->deliverables);

        $subStories = $item->subItems->map(function ($sub) {
            return [
                'id' => (string) $sub->id,
                'identifier' => ($sub->project?->identifier ?? 'ITEM').'-'.$sub->sequence_id,
                'title' => $sub->title,
                'priority' => $sub->priority,
                'estimate_points' => (float) ($sub->estimate_points ?? 0),
                'state' => $sub->state ? [
                    'id' => (string) $sub->state->id,
                    'name' => $sub->state->name,
                    'group' => $sub->state->group,
                    'color' => $sub->state->color,
                ] : null,
                'type' => $sub->type ? [
                    'id' => (string) $sub->type->id,
                    'name' => $sub->type->name,
                    'color' => $sub->type->color,
                ] : null,
                'assignees' => $sub->assignees->map(fn ($u) => [
                    'id' => (string) $u->id,
                    'name' => $u->name,
                    'avatar' => $u->avatar ?? null,
                ])->all(),
                'evidences' => $this->classifyDeliverables($sub->deliverables),
            ];
        })->values()->all();

        return [
            'id' => (string) $item->id,
            'identifier' => ($item->project?->identifier ?? 'ITEM').'-'.$item->sequence_id,
            'title' => $item->title,
            'description_html' => $item->description_html,
            'priority' => $item->priority,
            'estimate_points' => (float) ($item->estimate_points ?? 0),
            'project' => $item->project ? [
                'id' => (string) $item->project->id,
                'name' => $item->project->name,
                'identifier' => $item->project->identifier,
            ] : null,
            'state' => $item->state ? [
                'id' => (string) $item->state->id,
                'name' => $item->state->name,
                'group' => $item->state->group,
                'color' => $item->state->color,
            ] : null,
            'type' => $item->type ? [
                'id' => (string) $item->type->id,
                'name' => $item->type->name,
                'color' => $item->type->color,
            ] : null,
            'lead' => $item->lead ? [
                'id' => (string) $item->lead->id,
                'name' => $item->lead->name,
                'avatar' => $item->lead->avatar ?? null,
            ] : null,
            'assignees' => $item->assignees->map(fn ($u) => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'avatar' => $u->avatar ?? null,
            ])->all(),
            'target_date' => $item->target_date?->toDateString(),
            'completed_at' => $item->completed_at?->toIso8601String(),
            'evidences' => $evidences,
            'sub_stories' => $subStories,
            'has_sub_stories' => count($subStories) > 0,
        ];
    }

    /**
     * Clasifica los entregables en imágenes, PDFs y otros.
     */
    protected function classifyDeliverables($deliverables): array
    {
        $images = [];
        $pdfs = [];
        $others = [];

        foreach ($deliverables as $d) {
            $url = $d->file_url ?? $d->url;
            $mime = strtolower((string) ($d->file_mime ?? ''));
            $name = strtolower((string) ($d->file_name ?? $d->title ?? ''));

            $isImage = str_starts_with($mime, 'image/') || preg_match('/\.(png|jpe?g|gif|webp|svg)$/i', $name);
            $isPdf = $mime === 'application/pdf' || str_ends_with($name, '.pdf');

            $deliverableData = [
                'id' => (string) $d->id,
                'title' => $d->title,
                'file_name' => $d->file_name ?? $d->title,
                'file_size' => $d->file_size,
                'file_mime' => $d->file_mime,
                'url' => $url,
                'status' => $d->status,
                'created_at' => $d->created_at?->toIso8601String(),
                'creator' => $d->creator ? [
                    'id' => (string) $d->creator->id,
                    'name' => $d->creator->name,
                ] : null,
            ];

            if ($isImage) {
                $images[] = $deliverableData;
            } elseif ($isPdf) {
                $pdfs[] = $deliverableData;
            } else {
                $others[] = $deliverableData;
            }
        }

        return [
            'images' => $images,
            'pdfs' => $pdfs,
            'others' => $others,
            'all' => array_merge($images, $pdfs, $others),
            'count' => count($images) + count($pdfs) + count($others),
        ];
    }
}
