<?php

namespace App\Http\Requests\WorkItem;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class WorkItemDeliverableCreateRequest extends FormRequest
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
             * Título descriptivo del entregable
             *
             * @example Despliegue en Staging v1.2
             */
            'title' => ['required', 'string', 'max:255'],

            /**
             * Tipo de entregable (PREVIEW_URL, PULL_REQUEST, DESIGN, DOCUMENT, QA_EVIDENCE)
             *
             * @example PREVIEW_URL
             */
            'type' => ['required', 'string', 'in:PREVIEW_URL,PULL_REQUEST,DESIGN,DOCUMENT,QA_EVIDENCE'],

            /**
             * URL del recurso externo (opcional)
             *
             * @example https://staging.example.com
             */
            'url' => ['nullable', 'url', 'max:2048'],

            /**
             * Archivo adjunto de evidencia (PDF, imagen, zip, etc. Máx 50MB)
             */
            'file' => ['nullable', 'file', 'max:51200'],

            /**
             * Notas o descripción técnica adicional
             *
             * @example Contiene el switch bancario y pruebas de regresión.
             */
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
