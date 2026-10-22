<?php

namespace App\Http\Requests\Cycle;

use App\Models\Project;
use App\Services\CycleService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

class CycleCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'string', 'in:DRAFT,UPCOMING,CURRENT,COMPLETED'],
            'owned_by' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $project = $this->route('project');
            $projectId = $project instanceof Project ? $project->id : (int) $project;

            if ($projectId) {
                $cycleService = app(CycleService::class);
                try {
                    $cycleService->validateNoOverlap(
                        projectId: $projectId,
                        startDate: $this->input('start_date'),
                        endDate: $this->input('end_date'),
                        status: $this->input('status')
                    );
                } catch (ValidationException $e) {
                    foreach ($e->errors() as $field => $messages) {
                        foreach ($messages as $msg) {
                            $validator->errors()->add($field, $msg);
                        }
                    }
                }
            }
        });
    }
}
