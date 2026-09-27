<?php

namespace App\Http\Requests\Release;

use Illuminate\Foundation\Http\FormRequest;

class ReleaseCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'version' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'changelog' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:DRAFT,PUBLISHED,ARCHIVED'],
            'work_item_ids' => ['nullable', 'array'],
            'work_item_ids.*' => ['exists:work_items,id'],
        ];
    }
}
