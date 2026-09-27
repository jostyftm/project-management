<?php

namespace App\Http\Requests\WorkItem;

use Illuminate\Foundation\Http\FormRequest;

class WorkItemCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /**
             * Título del work item
             *
             * @example Implementar flujo de autenticación con cookies
             */
            'title' => ['required', 'string', 'max:255'],

            /**
             * Descripción estructurada en JSON o texto
             */
            'description_json' => ['nullable'],

            /**
             * ID del estado inicial
             *
             * @example 1
             */
            'state_id' => ['sometimes', 'exists:states,id'],

            /**
             * Prioridad
             *
             * @example HIGH
             */
            'priority' => ['sometimes', 'string', 'in:URGENT,HIGH,MEDIUM,LOW,NONE'],

            /**
             * ID del work item padre (para subtareas)
             */
            'parent_id' => ['nullable', 'exists:work_items,id'],

            /**
             * Puntos de estimación
             *
             * @example 5.0
             */
            'estimate_points' => ['nullable', 'numeric', 'min:0', 'max:100'],

            /**
             * Fecha de inicio
             *
             * @example 2026-09-27
             */
            'start_date' => ['nullable', 'date'],

            /**
             * Fecha límite objetivo
             *
             * @example 2026-10-05
             */
            'target_date' => ['nullable', 'date'],

            /**
             * IDs de usuarios asignados
             *
             * @example [1, 2]
             */
            'assignee_ids' => ['sometimes', 'array'],
            'assignee_ids.*' => ['exists:users,id'],

            /**
             * IDs de etiquetas vinculadas
             *
             * @example [1]
             */
            'label_ids' => ['sometimes', 'array'],
            'label_ids.*' => ['exists:labels,id'],

            /**
             * Si es un borrador persistente
             *
             * @example false
             */
            'is_draft' => ['sometimes', 'boolean'],
            'type_id' => ['nullable', 'exists:work_item_types,id'],
            'estimate_value' => ['nullable', 'string', 'max:20'],
            'cycle_id' => ['nullable', 'exists:cycles,id'],
            'module_id' => ['nullable', 'exists:modules,id'],
        ];
    }
}
