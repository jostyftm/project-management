<?php

namespace App\Http\Resources\Comment;

use App\Http\Resources\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'comments',
            'id' => (string) $this->id,
            'attributes' => [
                'workspace_id' => $this->workspace_id,
                'project_id' => $this->project_id,
                'work_item_id' => $this->work_item_id,
                'page_id' => $this->page_id,
                'user_id' => $this->user_id,
                'content' => $this->content,
                'mentioned_user_ids' => $this->mentioned_user_ids ?? [],
                'created_at' => $this->created_at?->toIso8601String(),
                'updated_at' => $this->updated_at?->toIso8601String(),
            ],
            'relationships' => [
                'user' => [
                    'data' => $this->whenLoaded('user', fn () => new UserResource($this->user)),
                ],
            ],
        ];
    }
}
