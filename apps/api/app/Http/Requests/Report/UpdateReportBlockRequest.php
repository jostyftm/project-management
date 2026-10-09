<?php

namespace App\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class UpdateReportBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'width' => ['nullable', 'integer', 'min:1', 'max:12'],
            'config' => ['nullable', 'array'],
            'is_visible' => ['nullable', 'boolean'],
        ];
    }
}
