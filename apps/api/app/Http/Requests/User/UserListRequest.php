<?php

namespace App\Http\Requests\User;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UserListRequest extends FormRequest
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
             * Filter by name
             *
             * @example jhon
             */
            'filter.name' => ['sometimes', 'string'],

            /**
             * Filter by email
             *
             * @example jhon@mail.com
             */
            'filter.email' => ['sometimes', 'string'],

            /**
             * Sort by name or email
             *
             * @example name or email
             */
            'sort' => ['sometimes', 'string'],

            /**
             * Paginate the results
             *
             * @example true
             */
            'paginate' => ['sometimes', 'in:true,false'],

            /**
             * Limit the number of results per page
             *
             * @example 10
             */
            'limit' => ['sometimes', 'integer'],
        ];
    }
}
