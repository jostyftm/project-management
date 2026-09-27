<?php

namespace App\Http\Requests\Cycle;

use Illuminate\Foundation\Http\FormRequest;

class CycleCompleteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'transfer_target' => ['nullable', 'string', 'in:BACKLOG,CYCLE'],
            'target_cycle_id' => ['nullable', 'integer', 'exists:cycles,id'],
        ];
    }
}
