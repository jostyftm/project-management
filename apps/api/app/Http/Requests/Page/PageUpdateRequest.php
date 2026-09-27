<?php

namespace App\Http\Requests\Page;

use Illuminate\Foundation\Http\FormRequest;

class PageUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:pages,id'],
            'content_json' => ['sometimes', 'nullable', 'array'],
            'is_published' => ['sometimes', 'boolean'],
            'is_locked' => ['sometimes', 'boolean'],
            'access' => ['sometimes', 'string', 'in:PUBLIC,WORKSPACE,PRIVATE'],
            'icon' => ['nullable', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:50'],
            'order' => ['sometimes', 'integer'],
        ];
    }
}
