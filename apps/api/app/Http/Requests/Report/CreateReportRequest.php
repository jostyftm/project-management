<?php

namespace App\Http\Requests\Report;

use App\Enums\ReportVisibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'visibility' => ['nullable', Rule::in(ReportVisibility::values())],
            'theme' => ['nullable', 'array'],
            'layout_config' => ['nullable', 'array'],
            'template' => ['nullable', 'string'],
        ];
    }
}
