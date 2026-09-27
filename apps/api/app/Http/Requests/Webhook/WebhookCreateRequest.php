<?php

namespace App\Http\Requests\Webhook;

use Illuminate\Foundation\Http\FormRequest;

class WebhookCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'url' => ['required', 'url'],
            'secret_token' => ['nullable', 'string', 'max:255'],
            'events_subscribed' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
