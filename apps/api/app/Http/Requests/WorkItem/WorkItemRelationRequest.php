<?php

namespace App\Http\Requests\WorkItem;

use Illuminate\Foundation\Http\FormRequest;

class WorkItemRelationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target_id' => ['required', 'integer', 'exists:work_items,id'],
            'relation_type' => ['nullable', 'string', 'in:BLOCKS,BLOCKED_BY,RELATES_TO,DUPLICATE_OF'],
        ];
    }
}
