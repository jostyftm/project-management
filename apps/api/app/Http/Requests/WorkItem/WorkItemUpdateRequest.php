<?php

namespace App\Http\Requests\WorkItem;

use Illuminate\Foundation\Http\FormRequest;

class WorkItemUpdateRequest extends FormRequest
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
             * @example Optimizar consultas de tareas
             */
            'title' => ['sometimes', 'string', 'max:255'],

            /**
             * Descripción en formato HTML puro
             */
            'description_html' => ['nullable', 'string'],

            /**
             * Alias de descripción (HTML o texto)
             */
            'description' => ['nullable', 'string'],

            /**
             * Descripción en formato JSON o texto (legacy)
             */
            'description_json' => ['nullable'],

            /**
             * ID del nuevo estado
             *
             * @example 2
             */
            'state_id' => ['sometimes', 'exists:states,id'],

            /**
             * Prioridad
             *
             * @example URGENT
             */
            'priority' => ['sometimes', 'string', 'in:URGENT,HIGH,MEDIUM,LOW,NONE'],

            /**
             * Estimación
             *
             * @example 8.0
             */
            'estimate_points' => ['nullable', 'numeric', 'min:0', 'max:100'],

            /**
             * Fecha de inicio
             */
            'start_date' => ['nullable', 'date'],

            /**
             * Fecha límite
             */
            'target_date' => ['nullable', 'date'],

            /**
             * IDs de asignados
             */
            'assignee_ids' => ['sometimes', 'array'],
            'assignee_ids.*' => ['exists:users,id'],

            /**
             * IDs de etiquetas
             */
            'label_ids' => ['sometimes', 'array'],
            'label_ids.*' => ['exists:labels,id'],

            /**
             * Borrador
             */
            'is_draft' => ['sometimes', 'boolean'],
            'type_id' => ['nullable', 'exists:work_item_types,id'],
            'lead_id' => ['nullable', 'exists:users,id'],
            'milestone_id' => ['nullable', 'exists:milestones,id'],
            'estimate_value' => ['nullable', 'string', 'max:20'],
            'parent_id' => ['nullable', 'exists:work_items,id'],
            'cycle_id' => ['nullable', 'exists:cycles,id'],
            'module_id' => ['nullable', 'exists:modules,id'],
        ];
    }
}
