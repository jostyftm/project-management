<?php

namespace App\Http\Resources\Project;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LabelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'labels',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'color' => $this->color,
                'description' => $this->description,
            ],
        ];
    }
}
