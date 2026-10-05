<?php

namespace App\Http\Resources\Report;

use App\Http\Resources\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkspaceReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'workspace_reports',
            'id'   => (string) $this->id,
            'attributes' => [
                'title'         => $this->title,
                'description'   => $this->description,
                'visibility'    => $this->visibility instanceof \App\Enums\ReportVisibility ? $this->visibility->value : $this->visibility,
                'theme'         => $this->theme ?? [],
                'layout_config' => $this->layout_config ?? [],
                'public_token'  => $this->public_token,
                'published_at'  => $this->published_at?->toISOString(),
                'blocks_count'  => $this->blocks_count ?? $this->blocks()->count(),
                'created_at'    => $this->created_at?->toISOString(),
                'updated_at'    => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'owner'  => new UserResource($this->whenLoaded('owner')),
                'blocks' => ReportBlockResource::collection($this->whenLoaded('blocks')),
            ],
        ];
    }
}
