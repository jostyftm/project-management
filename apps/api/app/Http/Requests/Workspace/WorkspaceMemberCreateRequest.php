<?php

namespace App\Http\Requests\Workspace;

use Illuminate\Foundation\Http\FormRequest;

class WorkspaceMemberCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /**
             * Correo electrónico del usuario a invitar
             *
             * @example dev@plane.local
             */
            'email' => ['required', 'string', 'email'],

            /**
             * Rol en el workspace
             *
             * @example MEMBER
             */
            'role' => ['required', 'string', 'in:ADMIN,MEMBER,GUEST'],
        ];
    }
}
