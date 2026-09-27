<?php

namespace App\Http\Requests\View;

use Illuminate\Foundation\Http\FormRequest;

class ViewCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'filters' => ['nullable', 'array'],
            'display_filters' => ['nullable', 'array'],
        ];
    }
}
