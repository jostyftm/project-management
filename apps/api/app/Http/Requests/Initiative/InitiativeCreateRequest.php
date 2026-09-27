<?php

namespace App\Http\Requests\Initiative;

use Illuminate\Foundation\Http\FormRequest;

class InitiativeCreateRequest extends FormRequest
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
            'status' => ['sometimes', 'string', 'in:PLANNED,IN_PROGRESS,ACHIEVED,CANCELLED'],
            'project_ids' => ['nullable', 'array'],
            'project_ids.*' => ['exists:projects,id'],
        ];
    }
}
