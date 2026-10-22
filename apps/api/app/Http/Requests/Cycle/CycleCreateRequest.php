<?php

namespace App\Http\Requests\Cycle;

use Illuminate\Foundation\Http\FormRequest;

class CycleCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'sprint_goal' => ['nullable', 'string', 'max:2000'],
            'capacity_points' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'string', 'in:DRAFT,UPCOMING,CURRENT,COMPLETED'],
            'owned_by' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
