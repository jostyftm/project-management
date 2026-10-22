<?php

namespace App\Http\Requests\Cycle;

use App\Models\Cycle;
use App\Services\CycleService;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

class CycleUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'status' => ['sometimes', 'string', 'in:DRAFT,UPCOMING,CURRENT,COMPLETED'],
            'owned_by' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $cycle = $this->route('cycle');
            $cycleId = $cycle instanceof Cycle ? $cycle->id : (int) $cycle;
            $projectId = $cycle instanceof Cycle ? $cycle->project_id : Cycle::where('id', $cycleId)->value('project_id');

            $currentCycle = $cycle instanceof Cycle ? $cycle : Cycle::find($cycleId);

            $startDate = $this->has('start_date')
                ? $this->input('start_date')
                : ($currentCycle?->start_date ? Carbon::parse($currentCycle->start_date)->format('Y-m-d') : null);

            $endDate = $this->has('end_date')
                ? $this->input('end_date')
                : ($currentCycle?->end_date ? Carbon::parse($currentCycle->end_date)->format('Y-m-d') : null);

            if ($startDate && $endDate && Carbon::parse($endDate)->lt(Carbon::parse($startDate))) {
                $validator->errors()->add('end_date', 'La fecha de finalización debe ser igual o posterior a la fecha de inicio.');

                return;
            }

            if ($projectId) {
                $cycleService = app(CycleService::class);
                try {
                    $cycleService->validateNoOverlap(
                        projectId: $projectId,
                        startDate: $startDate,
                        endDate: $endDate,
                        status: $this->input('status'),
                        ignoreCycleId: $cycleId
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
