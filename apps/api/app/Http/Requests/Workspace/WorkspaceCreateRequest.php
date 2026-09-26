<?php

namespace App\Http\Requests\Workspace;

use Illuminate\Foundation\Http\FormRequest;

class WorkspaceCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /**
             * Nombre del workspace
             *
             * @example Acquis Engineering
             */
            'name' => ['required', 'string', 'max:100'],

            /**
             * Slug único para la URL
             *
             * @example acquis-engineering
             */
            'slug' => ['nullable', 'string', 'max:100', 'unique:workspaces,slug'],

            /**
             * URL del logotipo del workspace
             *
             * @example https://images.plane.so/logo.png
             */
            'logo_url' => ['nullable', 'string', 'url'],
        ];
    }
}
