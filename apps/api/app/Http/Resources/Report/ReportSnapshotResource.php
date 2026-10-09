<?php

namespace App\Http\Resources\Report;

use App\Http\Resources\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportSnapshotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'report_snapshots',
            'id' => (string) $this->id,
            'attributes' => [
                'report_id' => (string) $this->report_id,
                'title' => $this->title,
                'blocks_snapshot' => $this->blocks_snapshot ?? [],
                'theme_snapshot' => $this->theme_snapshot ?? [],
                'note' => $this->note,
                'blocks_count' => count($this->blocks_snapshot ?? []),
                'created_at' => $this->created_at?->toISOString(),
            ],
            'relationships' => [
                'creator' => new UserResource($this->whenLoaded('creator')),
            ],
        ];
    }
}
