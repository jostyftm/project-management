<?php

namespace App\Http\Requests\WorkItem;

use Illuminate\Foundation\Http\FormRequest;

class WorkItemListRequest extends FormRequest
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
             * Cantidad de work items por página
             *
             * @example 20
             */
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],

            /**
             * Filtrar por ID de estado
             *
             * @example 1
             */
            'filter.state_id' => ['sometimes', 'integer'],

            /**
             * Filtrar por grupo de estado
             *
             * @example STARTED
             */
            'filter.state.group' => ['sometimes', 'string'],

            /**
             * Filtrar por prioridad
             *
             * @example HIGH
             */
            'filter.priority' => ['sometimes', 'string'],

            /**
             * Buscar por título
             *
             * @example Autenticación
             */
            'filter.title' => ['sometimes', 'string'],

            /**
             * Filtrar borradores
             *
             * @example false
             */
            'filter.is_draft' => ['sometimes', 'boolean'],
        ];
    }
}
