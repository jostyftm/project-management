<?php

namespace App\Http\Requests\Sticky;

use Illuminate\Foundation\Http\FormRequest;

class StickyCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'content' => ['required', 'string'],
            'color' => ['sometimes', 'string', 'in:yellow,green,blue,pink,purple'],
            'is_pinned' => ['sometimes', 'boolean'],
            'is_private' => ['sometimes', 'boolean'],
            'position_x' => ['sometimes', 'integer'],
            'position_y' => ['sometimes', 'integer'],
        ];
    }
}
