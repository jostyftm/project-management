<?php

namespace App\Http\Requests\Report;

use App\Enums\BlockType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateReportBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'       => ['required', Rule::in(BlockType::values())],
            'title'      => ['nullable', 'string', 'max:255'],
            'position'   => ['nullable', 'integer', 'min:0'],
            'width'      => ['nullable', 'integer', 'min:1', 'max:12'],
            'config'     => ['nullable', 'array'],
            'is_visible' => ['nullable', 'boolean'],
        ];
    }
}
