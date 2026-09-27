<?php

namespace App\Http\Requests\Comment;

use Illuminate\Foundation\Http\FormRequest;

class CommentCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'content' => ['required', 'string'],
            'work_item_id' => ['nullable', 'exists:work_items,id'],
            'page_id' => ['nullable', 'exists:pages,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'mentioned_user_ids' => ['nullable', 'array'],
            'mentioned_user_ids.*' => ['exists:users,id'],
        ];
    }
}
