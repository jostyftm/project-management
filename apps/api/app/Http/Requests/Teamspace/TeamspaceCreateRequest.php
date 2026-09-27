<?php

namespace App\Http\Requests\Teamspace;

use Illuminate\Foundation\Http\FormRequest;

class TeamspaceCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'icon' => ['nullable', 'string', 'max:50'],
            'project_ids' => ['nullable', 'array'],
            'project_ids.*' => ['exists:projects,id'],
        ];
    }
}
