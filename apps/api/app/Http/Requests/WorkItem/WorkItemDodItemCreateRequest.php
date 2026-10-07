<?php

namespace App\Http\Requests\WorkItem;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class WorkItemDodItemCreateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            /**
             * Criterio de aceptación o Definition of Done
             *
             * @example Cobertura de pruebas unitarias superior al 90%
             */
            'title' => ['required', 'string', 'max:255'],
        ];
    }
}
