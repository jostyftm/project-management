<?php

namespace App\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class ReorderBlocksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order'            => ['required', 'array'],
            'order.*.id'       => ['required', 'integer'],
            'order.*.position' => ['required', 'integer', 'min:0'],
        ];
    }
}
