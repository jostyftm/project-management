<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /**
             * Nombre completo del usuario
             *
             * @example Alan Turing
             */
            'name' => ['required', 'string', 'max:255'],

            /**
             * Correo electrónico único
             *
             * @example alan.turing@plane.local
             */
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],

            /**
             * Contraseña segura
             *
             * @example Password123!
             */
            'password' => ['required', 'string', 'min:8'],

            /**
             * Nombre opcional para el workspace inicial
             *
             * @example Alan Labs
             */
            'workspace_name' => ['nullable', 'string', 'max:100'],
        ];
    }
}
