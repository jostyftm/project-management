<?php

namespace App\Services;

use App\Models\Project;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemDeliverable;
use App\Models\WorkItemDodItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkItemDeliverableService
{
    /**
     * Listar todos los entregables y elementos DoD de una historia de trabajo.
     *
     * @return array{deliverables: Collection, dod_items: Collection}
     */
    public function list(WorkItem $workItem, Project $project): array
    {
        $this->ensureBelongsToProject($project, $workItem);

        $deliverables = $workItem->deliverables()
            ->with(['creator', 'reviewer'])
            ->get();

        $dodItems = $workItem->dodItems()
            ->with('completedBy')
            ->get();

        return [
            'deliverables' => $deliverables,
            'dod_items' => $dodItems,
        ];
    }

    /**
     * Crear un nuevo entregable (enlace externo o archivo físico).
     */
    public function createDeliverable(
        WorkItem $workItem,
        Project $project,
        User $user,
        array $data,
        ?UploadedFile $file = null
    ): WorkItemDeliverable {
        $this->ensureBelongsToProject($project, $workItem);

        $diskName = config('filesystems.default');
        $filePath = null;
        $fileName = null;
        $fileSize = null;
        $fileMime = null;

        if ($file) {
            $filePath = $file->store("projects/{$project->id}/deliverables", $diskName);
            $fileName = $file->getClientOriginalName();
            $fileSize = $file->getSize();
            $fileMime = $file->getClientMimeType();
        }

        $deliverable = WorkItemDeliverable::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'work_item_id' => $workItem->id,
            'created_by' => $user->id,
            'title' => $data['title'],
            'type' => $data['type'],
            'url' => $data['url'] ?? null,
            'disk' => $filePath ? $diskName : null,
            'file_path' => $filePath,
            'file_name' => $fileName,
            'file_size' => $fileSize,
            'file_mime' => $fileMime,
            'description' => $data['description'] ?? null,
            'status' => 'PENDING_REVIEW',
        ]);

        return $deliverable->load(['creator', 'reviewer']);
    }

    /**
     * Eliminar un entregable existente y limpiar el archivo del disco configurado.
     */
    public function deleteDeliverable(
        WorkItem $workItem,
        Project $project,
        WorkItemDeliverable $deliverable,
        User $user
    ): void {
        $this->ensureBelongsToProject($project, $workItem);

        if ($deliverable->work_item_id !== $workItem->id) {
            abort(404, 'Entregable no encontrado en esta historia de trabajo.');
        }

        $isCreator = $deliverable->created_by === $user->id;
        $isAdmin = $user->is_instance_admin || $project->members()
            ->where('user_id', $user->id)
            ->where('role', 'ADMIN')
            ->exists();

        if (! $isCreator && ! $isAdmin) {
            abort(403, 'No autorizado para eliminar este entregable.');
        }

        if ($deliverable->file_path) {
            $diskName = $deliverable->disk ?? config('filesystems.default');
            $disk = Storage::disk($diskName);
            if ($disk->exists($deliverable->file_path)) {
                $disk->delete($deliverable->file_path);
            }
        }

        $deliverable->delete();
    }

    /**
     * Revisar y certificar un entregable (Aprobar, Observar o Devolver a revisión).
     */
    public function reviewDeliverable(
        WorkItem $workItem,
        Project $project,
        WorkItemDeliverable $deliverable,
        User $reviewer,
        array $data
    ): WorkItemDeliverable {
        $this->ensureBelongsToProject($project, $workItem);

        if ($deliverable->work_item_id !== $workItem->id) {
            abort(404, 'Entregable no encontrado en esta historia de trabajo.');
        }

        $deliverable->update([
            'status' => $data['status'],
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        return $deliverable->load(['creator', 'reviewer']);
    }

    /**
     * Descargar el archivo físico de un entregable por streaming desde el disco configurado.
     */
    public function downloadDeliverable(
        WorkItem $workItem,
        Project $project,
        WorkItemDeliverable $deliverable
    ): StreamedResponse {
        $this->ensureBelongsToProject($project, $workItem);

        if ($deliverable->work_item_id !== $workItem->id) {
            abort(404, 'Entregable no encontrado en esta historia de trabajo.');
        }

        if (! $deliverable->file_path) {
            abort(404, 'Este entregable no contiene un archivo adjunto.');
        }

        $diskName = $deliverable->disk ?? config('filesystems.default');
        $disk = Storage::disk($diskName);

        if (! $disk->exists($deliverable->file_path)) {
            abort(404, 'El archivo no fue encontrado en el sistema de almacenamiento.');
        }

        return $disk->download(
            $deliverable->file_path,
            $deliverable->file_name ?? basename($deliverable->file_path)
        );
    }

    /**
     * Crear un nuevo criterio Definition of Done (DoD).
     */
    public function createDodItem(
        WorkItem $workItem,
        Project $project,
        array $data
    ): WorkItemDodItem {
        $this->ensureBelongsToProject($project, $workItem);

        return WorkItemDodItem::create([
            'work_item_id' => $workItem->id,
            'title' => $data['title'],
            'is_completed' => false,
        ]);
    }

    /**
     * Alternar el estado de completado de un criterio DoD.
     */
    public function toggleDodItem(
        WorkItem $workItem,
        Project $project,
        WorkItemDodItem $dodItem,
        User $user
    ): WorkItemDodItem {
        $this->ensureBelongsToProject($project, $workItem);

        if ($dodItem->work_item_id !== $workItem->id) {
            abort(404, 'Criterio DoD no pertenece a esta historia de trabajo.');
        }

        $newCompleted = ! $dodItem->is_completed;
        $dodItem->update([
            'is_completed' => $newCompleted,
            'completed_by' => $newCompleted ? $user->id : null,
            'completed_at' => $newCompleted ? now() : null,
        ]);

        return $dodItem->load('completedBy');
    }

    /**
     * Eliminar un criterio DoD.
     */
    public function deleteDodItem(
        WorkItem $workItem,
        Project $project,
        WorkItemDodItem $dodItem
    ): void {
        $this->ensureBelongsToProject($project, $workItem);

        if ($dodItem->work_item_id !== $workItem->id) {
            abort(404, 'Criterio DoD no pertenece a esta historia de trabajo.');
        }

        $dodItem->delete();
    }

    /**
     * Valida que el work item pertenezca al proyecto indicado.
     */
    public function ensureBelongsToProject(Project $project, WorkItem $workItem): void
    {
        if ($workItem->project_id !== $project->id) {
            abort(404, 'Elemento de trabajo no pertenece a este proyecto.');
        }
    }
}
