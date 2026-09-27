<?php

namespace App\Http\Requests\Milestone;

use Illuminate\Foundation\Http\FormRequest;

class MilestoneCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'target_date' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', 'in:PENDING,COMPLETED,DELAYED'],
            'work_item_ids' => ['nullable', 'array'],
            'work_item_ids.*' => ['exists:work_items,id'],
        ];
    }
}
