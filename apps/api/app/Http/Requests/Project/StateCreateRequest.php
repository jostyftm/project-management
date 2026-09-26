<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class StateCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /**
             * Nombre del estado
             *
             * @example En Revisión
             */
            'name' => ['required', 'string', 'max:50'],

            /**
             * Color HEX del estado
             *
             * @example #F59E0B
             */
            'color' => ['sometimes', 'string', 'max:10'],

            /**
             * Grupo de estado
             *
             * @example STARTED
             */
            'group' => ['required', 'string', 'in:BACKLOG,UNSTARTED,STARTED,COMPLETED,CANCELLED'],

            /**
             * Secuencia para ordenamiento
             *
             * @example 2
             */
            'sequence' => ['sometimes', 'integer'],

            /**
             * Indica si es el estado predeterminado del grupo
             *
             * @example false
             */
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
