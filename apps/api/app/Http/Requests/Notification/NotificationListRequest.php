<?php

namespace App\Http\Requests\Notification;

use Illuminate\Foundation\Http\FormRequest;

class NotificationListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'unread' => ['nullable', 'string', 'in:true,false,1,0'],
            'type' => ['nullable', 'string'],
        ];
    }
}
