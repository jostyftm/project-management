<?php

namespace App\Http\Requests\User;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UserCreateRequest extends FormRequest
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
             * User Auth Service ID (opcional)
             *
             * @example 12345
             */
            'user_auth_id' => ['sometimes', 'nullable', 'integer'],

            /**
             * User name
             *
             * @example Jhon Doe
             */
            'name' => ['required', 'string', 'max:255'],

            /**
             * User email
             *
             * @example jhondoe@mail.com
             */
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],

            /**
             * User password
             *
             * @example password123
             */
            'password' => ['required', 'string', 'min:8'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => __('validation.unique', ['attribute' => 'email']),
        ];
    }
}
