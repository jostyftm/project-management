<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class ProjectCreateRequest extends FormRequest
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
             * @example Plane Engine
             */
            'name' => ['required', 'string', 'max:100'],

            /**
             * Identificador único corto para los work items (2 a 8 caracteres alfanuméricos en mayúsculas)
             *
             * @example PLN
             */
            'identifier' => ['required', 'string', 'min:2', 'max:8', 'regex:/^[A-Z0-9]+$/'],

            /**
             * Descripción del proyecto
             *
             * @example Plataforma central de gestión de tareas y ciclos
             */
            'description' => ['nullable', 'string'],

            /**
             * Icono o emoji del proyecto
             *
             * @example 🚀
             */
            'icon' => ['nullable', 'string', 'max:50'],

            /**
             * Visibilidad pública dentro del workspace
             *
             * @example false
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
        ];
    }
}
