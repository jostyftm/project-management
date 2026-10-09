<?php

namespace Database\Factories;

use App\Models\ReportSnapshot;
use App\Models\User;
use App\Models\WorkspaceReport;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReportSnapshotFactory extends Factory
{
    protected $model = ReportSnapshot::class;

    public function definition(): array
    {
        return [
            'report_id' => WorkspaceReport::factory(),
            'created_by' => User::factory(),
            'title' => 'Snapshot '.$this->faker->words(2, true),
            'blocks_snapshot' => [
                [
                    'id' => '1',
                    'type' => 'kpi_row',
                    'title' => 'KPIs Congelados',
                    'width' => 12,
                    'position' => 0,
                    'config' => [],
                    'data' => ['kpis' => []],
                ],
            ],
            'theme_snapshot' => ['primaryColor' => '#6366f1'],
            'note' => $this->faker->sentence(),
        ];
    }
}
