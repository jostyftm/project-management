<?php

namespace App\Http\Resources\WorkItemType;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkItemTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'work_item_types',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'description' => $this->description,
                'icon' => $this->icon,
                'color' => $this->color,
                'is_default' => $this->is_default,
                'is_global' => is_null($this->project_id),
            ],
        ];
    }
}
