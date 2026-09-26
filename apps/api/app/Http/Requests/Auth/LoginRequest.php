<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /**
             * Correo electrónico del usuario
             *
             * @example alan.turing@plane.local
             */
            'email' => ['required', 'string', 'email'],

            /**
             * Contraseña
             *
             * @example Password123!
             */
            'password' => ['required', 'string'],
        ];
    }
}
