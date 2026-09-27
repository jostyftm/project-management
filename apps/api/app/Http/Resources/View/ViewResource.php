<?php

namespace App\Http\Resources\View;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ViewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'views',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'description' => $this->description,
                'filters' => $this->filters ?? [],
                'display_filters' => $this->display_filters ?? [],
                'project_id' => $this->project_id ? (string) $this->project_id : null,
                'is_project_view' => ! is_null($this->project_id),
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
        ];
    }
}
