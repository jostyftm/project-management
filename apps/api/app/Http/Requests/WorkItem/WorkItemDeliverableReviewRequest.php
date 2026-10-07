<?php

namespace App\Http\Requests\WorkItem;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class WorkItemDeliverableReviewRequest extends FormRequest
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
             * Veredicto de revisión del entregable
             *
             * @example APPROVED
             */
            'status' => ['required', 'string', 'in:APPROVED,REJECTED,PENDING_REVIEW'],

            /**
             * Observaciones o retroalimentación del revisor
             *
             * @example Diseño y flujos validados conforme a los criterios de aceptación.
             */
            'review_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
