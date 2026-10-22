<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectMemberRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role' => ['sometimes', 'string', 'in:ADMIN,MEMBER,VIEWER'],
            'capacity_points' => ['nullable', 'numeric', 'min:0', 'max:1000'],
        ];
    }
}
