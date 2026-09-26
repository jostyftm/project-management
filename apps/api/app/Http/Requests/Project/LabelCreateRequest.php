<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class LabelCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /**
             * Nombre de la etiqueta
             *
             * @example Bug
             */
            'name' => ['required', 'string', 'max:50'],

            /**
             * Color HEX
             *
             * @example #EF4444
             */
            'color' => ['sometimes', 'string', 'max:10'],

            /**
             * Descripción opcional
             *
             * @example Problemas e incidencias críticas
             */
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
