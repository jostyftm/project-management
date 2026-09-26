<?php

namespace App\Http\Resources\Project;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'states',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'color' => $this->color,
                'group' => $this->group,
                'sequence' => $this->sequence,
                'is_default' => $this->is_default,
            ],
        ];
    }
}
