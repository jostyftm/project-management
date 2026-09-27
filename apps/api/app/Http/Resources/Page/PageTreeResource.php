<?php

namespace App\Http\Resources\Page;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PageTreeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'title' => $this->title,
            'icon' => $this->icon,
            'color' => $this->color,
            'is_published' => (bool) $this->is_published,
            'is_locked' => (bool) $this->is_locked,
            'parent_id' => $this->parent_id ? (string) $this->parent_id : null,
            'project_id' => $this->project_id ? (string) $this->project_id : null,
            'order' => (int) $this->order,
            'children' => PageTreeResource::collection($this->whenLoaded('children')),
        ];
    }
}
