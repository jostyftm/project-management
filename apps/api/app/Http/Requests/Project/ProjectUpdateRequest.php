<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class ProjectUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /**
             * Nombre del proyecto
             *
             * @example Plane Engine Core
             */
            'name' => ['sometimes', 'string', 'max:100'],

            /**
             * Descripción
             */
            'description' => ['nullable', 'string'],

            /**
             * Icono o emoji
             */
            'icon' => ['nullable', 'string', 'max:50'],

            /**
             * Estado de archivado
             */
            'is_archived' => ['sometimes', 'boolean'],

            /**
             * Visibilidad
             */
            'is_public' => ['sometimes', 'boolean'],

            /**
             * Líder de proyecto
             */
            'lead_id' => ['nullable', 'exists:users,id'],

            /**
             * Sistema de estimación de esfuerzo
             *
             * @example FIBONACCI
             */
            'estimate_system' => ['sometimes', 'string', 'in:FIBONACCI,TSHIRT,NUMERIC,NONE'],
            'start_date' => ['nullable', 'date'],
            'target_date' => ['nullable', 'date'],
        ];
    }
}
