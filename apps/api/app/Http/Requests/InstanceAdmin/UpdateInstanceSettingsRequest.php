<?php

namespace App\Http\Requests\InstanceAdmin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInstanceSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_instance_admin;
    }

    public function rules(): array
    {
        return [
            'instance_name' => ['sometimes', 'string', 'max:100'],
            'company_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'app_url' => ['sometimes', 'url', 'max:255'],
            'allow_signups' => ['sometimes', 'boolean'],
            'invite_only' => ['sometimes', 'boolean'],
            'allowed_domains' => ['sometimes', 'nullable', 'array'],
            'allowed_domains.*' => ['string'],
            'smtp_host' => ['sometimes', 'nullable', 'string', 'max:255'],
            'smtp_port' => ['sometimes', 'nullable', 'integer', 'between:1,65535'],
            'smtp_username' => ['sometimes', 'nullable', 'string', 'max:255'],
            'smtp_password' => ['sometimes', 'nullable', 'string', 'max:255'],
            'smtp_from_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'smtp_from_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'smtp_encryption' => ['sometimes', 'nullable', 'string', 'in:tls,ssl,none'],
            'max_upload_size_mb' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'enable_telemetry' => ['sometimes', 'boolean'],
        ];
    }
}
