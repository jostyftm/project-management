<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class ProjectListRequest extends FormRequest
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
             * Cantidad de registros por página
             *
             * @example 10
             */
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],

            /**
             * Filtrar por nombre
             *
             * @example Core Platform
             */
            'filter.name' => ['sometimes', 'string'],

            /**
             * Filtrar por identificador
             *
             * @example PLN
             */
            'filter.identifier' => ['sometimes', 'string'],

            /**
             * Filtrar proyectos archivados
             *
             * @example false
             */
            'filter.is_archived' => ['sometimes', 'boolean'],
        ];
    }
}
