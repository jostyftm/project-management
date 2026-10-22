<?php

namespace App\Services\Agile;

use App\Models\WorkItem;
use Illuminate\Support\Collection;

class WorkItemReadinessEvaluator
{
    /**
     * Evalúa si un Work Item cumple con la Definition of Ready (DoR) para entrar a un Sprint.
     *
     * @return array{is_ready: bool, missing: string[]}
     */
    public function evaluate(WorkItem $item): array
    {
        $missing = [];

        // 1. Estimación en puntos
        if ($item->estimate_points === null || (float) $item->estimate_points <= 0) {
            $missing[] = 'Sin estimación de puntos de historia';
        }

        // 2. Tipo de work item asignado
        if (! $item->type_id) {
            $missing[] = 'Sin tipo de elemento definido';
        }

        // 3. Descripción o criterios de aceptación (DoD)
        $hasDescription = ! empty(trim(strip_tags((string) ($item->description_html ?? $item->description))));
        $hasDod = $item->relationLoaded('dodItems')
            ? $item->dodItems->isNotEmpty()
            : $item->dodItems()->exists();

        if (! $hasDescription && ! $hasDod) {
            $missing[] = 'Sin descripción ni criterios de aceptación (DoD)';
        }

        // 4. Impedimentos activos
        if ($item->is_blocked) {
            $missing[] = 'Tiene un impedimento activo: '.($item->blocked_reason ?: 'bloqueado');
        }

        // 5. Dependencias bloqueantes abiertas
        $openBlockers = $this->getOpenBlockers($item);
        if ($openBlockers->isNotEmpty()) {
            $blockerIdentifiers = $openBlockers->map(function ($b) use ($item) {
                $p = $b->project ?? $item->project;

                return $p ? "{$p->identifier}-{$b->sequence_id}" : "#{$b->sequence_id}";
            })->implode(', ');

            $missing[] = "Bloqueado por dependencias sin completar ({$blockerIdentifiers})";
        }

        return [
            'is_ready' => empty($missing),
            'missing' => $missing,
            'reasons' => $missing,
        ];
    }

    /**
     * Obtiene los work items que bloquean a este elemento y que no están completados ni cancelados.
     */
    public function getOpenBlockers(WorkItem $item): Collection
    {
        $blockers = collect();

        // Relaciones salientes: este item es bloqueado por target (BLOCKED_BY)
        if ($item->relationLoaded('outwardRelations')) {
            foreach ($item->outwardRelations as $rel) {
                if ($rel->relation_type === 'BLOCKED_BY' && $rel->target) {
                    $group = strtoupper($rel->target->state?->group ?? '');
                    if (! in_array($group, ['COMPLETED', 'CANCELLED'])) {
                        $blockers->push($rel->target);
                    }
                }
            }
        } else {
            $targetItems = WorkItem::whereHas('inwardRelations', function ($q) use ($item) {
                $q->where('source_id', $item->id)->where('relation_type', 'BLOCKED_BY');
            })->with('state')->get();

            foreach ($targetItems as $target) {
                $group = strtoupper($target->state?->group ?? '');
                if (! in_array($group, ['COMPLETED', 'CANCELLED'])) {
                    $blockers->push($target);
                }
            }
        }

        // Relaciones entrantes: otro item bloquea a este (BLOCKS)
        if ($item->relationLoaded('inwardRelations')) {
            foreach ($item->inwardRelations as $rel) {
                if ($rel->relation_type === 'BLOCKS' && $rel->source) {
                    $group = strtoupper($rel->source->state?->group ?? '');
                    if (! in_array($group, ['COMPLETED', 'CANCELLED'])) {
                        $blockers->push($rel->source);
                    }
                }
            }
        } else {
            $sourceItems = WorkItem::whereHas('outwardRelations', function ($q) use ($item) {
                $q->where('target_id', $item->id)->where('relation_type', 'BLOCKS');
            })->with('state')->get();

            foreach ($sourceItems as $source) {
                $group = strtoupper($source->state?->group ?? '');
                if (! in_array($group, ['COMPLETED', 'CANCELLED'])) {
                    $blockers->push($source);
                }
            }
        }

        return $blockers->unique('id')->values();
    }
}
