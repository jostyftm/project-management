<?php

namespace Database\Factories;

use App\Enums\BlockType;
use App\Models\ReportBlock;
use App\Models\WorkspaceReport;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReportBlockFactory extends Factory
{
    protected $model = ReportBlock::class;

    public function definition(): array
    {
        return [
            'report_id' => WorkspaceReport::factory(),
            'type' => BlockType::NARRATIVE->value,
            'title' => $this->faker->words(3, true),
            'position' => 0,
            'width' => 12,
            'config' => ['content' => 'Contenido de prueba'],
            'data_cache' => null,
            'cached_at' => null,
            'is_visible' => true,
        ];
    }
}
