<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class StateUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:50'],
            'color' => ['sometimes', 'string', 'max:10'],
            'group' => ['sometimes', 'string', 'in:BACKLOG,UNSTARTED,STARTED,COMPLETED,CANCELLED'],
            'sequence' => ['sometimes', 'integer'],
            'is_default' => ['sometimes', 'boolean'],
            'wip_limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
