<?php

namespace App\Http\Requests\Workspace;

use Illuminate\Foundation\Http\FormRequest;

class WorkspaceUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $workspaceId = $this->route('workspace')?->id ?? $this->route('workspace');

        return [
            /**
             * Nombre del workspace
             *
             * @example Acquis Engineering Labs
             */
            'name' => ['sometimes', 'string', 'max:100'],

            /**
             * Slug único
             *
             * @example acquis-engineering-labs
             */
            'slug' => ['sometimes', 'string', 'max:100', 'unique:workspaces,slug,' . $workspaceId],

            /**
             * URL del logo
             *
             * @example https://images.plane.so/new-logo.png
             */
            'logo_url' => ['nullable', 'string', 'url'],
        ];
    }
}
