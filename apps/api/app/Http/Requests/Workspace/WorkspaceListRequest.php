<?php

namespace App\Http\Requests\Workspace;

use Illuminate\Foundation\Http\FormRequest;

class WorkspaceListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /**
             * Activar paginación
             *
             * @example true
             */
            'paginate' => ['sometimes', 'boolean'],

            /**
             * Límite de elementos por página
             *
             * @example 15
             */
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],

            /**
             * Filtrar por nombre
             *
             * @example Plane
             */
            'filter.name' => ['sometimes', 'string'],
        ];
    }
}
