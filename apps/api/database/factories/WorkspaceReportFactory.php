<?php

namespace Database\Factories;

use App\Enums\ReportVisibility;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceReport;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkspaceReportFactory extends Factory
{
    protected $model = WorkspaceReport::class;

    public function definition(): array
    {
        return [
            'workspace_id'  => function () {
                $user = User::factory()->create();
                return Workspace::create([
                    'name'     => 'Test Workspace',
                    'slug'     => 'test-ws-' . uniqid(),
                    'owner_id' => $user->id,
                ])->id;
            },
            'owner_id'      => User::factory(),
            'title'         => $this->faker->sentence(3),
            'description'   => $this->faker->paragraph(),
            'visibility'    => ReportVisibility::WORKSPACE->value,
            'theme'         => [],
            'layout_config' => ['columns' => 12],
            'public_token'  => null,
            'published_at'  => null,
        ];
    }
}
