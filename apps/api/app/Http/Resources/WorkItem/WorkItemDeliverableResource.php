<?php

namespace App\Http\Resources\WorkItem;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkItemDeliverableResource extends JsonResource
{
    /**
     * Transform the resource into an array (JSON:API format).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => 'work_item_deliverables',
            'id' => (string) $this->id,
            'attributes' => [
                'workspace_id' => (int) $this->workspace_id,
                'project_id' => (int) $this->project_id,
                'work_item_id' => (int) $this->work_item_id,
                'title' => $this->title,
                'type' => $this->type,
                'url' => $this->url,
                'disk' => $this->disk,
                'file_path' => $this->file_path,
                'file_name' => $this->file_name,
                'file_size' => $this->file_size ? (int) $this->file_size : null,
                'file_mime' => $this->file_mime,
                'file_url' => $this->file_url,
                'description' => $this->description,
                'status' => $this->status,
                'created_by' => (int) $this->created_by,
                'reviewed_by' => $this->reviewed_by ? (int) $this->reviewed_by : null,
                'reviewed_at' => $this->reviewed_at?->toIso8601String(),
                'review_notes' => $this->review_notes,
                'created_at' => $this->created_at?->toIso8601String(),
                'updated_at' => $this->updated_at?->toIso8601String(),
            ],
            'relationships' => [
                'creator' => [
                    'data' => $this->relationLoaded('creator') && $this->creator ? [
                        'id' => (string) $this->creator->id,
                        'name' => $this->creator->name,
                        'email' => $this->creator->email,
                    ] : null,
                ],
                'reviewer' => [
                    'data' => $this->relationLoaded('reviewer') && $this->reviewer ? [
                        'id' => (string) $this->reviewer->id,
                        'name' => $this->reviewer->name,
                        'email' => $this->reviewer->email,
                    ] : null,
                ],
            ],
        ];
    }
}
