<?php

namespace App\Services\Reports;

use App\Enums\BlockType;
use App\Models\ReportBlock;
use App\Models\WorkspaceReport;
use App\Services\Reports\Resolvers\AreaChartResolver;
use App\Services\Reports\Resolvers\BarChartResolver;
use App\Services\Reports\Resolvers\CalloutResolver;
use App\Services\Reports\Resolvers\CyclesOverviewResolver;
use App\Services\Reports\Resolvers\DividerResolver;
use App\Services\Reports\Resolvers\DonutChartResolver;
use App\Services\Reports\Resolvers\HeatmapResolver;
use App\Services\Reports\Resolvers\ImageResolver;
use App\Services\Reports\Resolvers\KpiRowResolver;
use App\Services\Reports\Resolvers\LineChartResolver;
use App\Services\Reports\Resolvers\MilestonesProgressResolver;
use App\Services\Reports\Resolvers\NarrativeResolver;
use App\Services\Reports\Resolvers\ProjectSummaryResolver;
use App\Services\Reports\Resolvers\RecentActivityResolver;
use App\Services\Reports\Resolvers\ReleasesTimelineResolver;
use App\Services\Reports\Resolvers\RisksBlockersResolver;
use App\Services\Reports\Resolvers\TableResolver;
use App\Services\Reports\Resolvers\TeamWorkloadResolver;
use App\Services\Reports\Resolvers\WorkItemsListResolver;
use Illuminate\Support\Facades\Cache;

class BlockResolverService
{
    /**
     * Registro de resolvers por tipo de bloque (19 tipos completos).
     */
    protected array $resolvers = [
        BlockType::KPI_ROW->value => KpiRowResolver::class,
        BlockType::NARRATIVE->value => NarrativeResolver::class,
        BlockType::LINE_CHART->value => LineChartResolver::class,
        BlockType::BAR_CHART->value => BarChartResolver::class,
        BlockType::DONUT_CHART->value => DonutChartResolver::class,
        BlockType::AREA_CHART->value => AreaChartResolver::class,
        BlockType::PROJECT_SUMMARY->value => ProjectSummaryResolver::class,
        BlockType::TABLE->value => TableResolver::class,
        BlockType::WORK_ITEMS_LIST->value => WorkItemsListResolver::class,
        BlockType::CYCLES_OVERVIEW->value => CyclesOverviewResolver::class,
        BlockType::RELEASES_TIMELINE->value => ReleasesTimelineResolver::class,
        BlockType::MILESTONES_PROGRESS->value => MilestonesProgressResolver::class,
        BlockType::TEAM_WORKLOAD->value => TeamWorkloadResolver::class,
        BlockType::RECENT_ACTIVITY->value => RecentActivityResolver::class,
        BlockType::RISKS_BLOCKERS->value => RisksBlockersResolver::class,
        BlockType::HEATMAP->value => HeatmapResolver::class,
        BlockType::DIVIDER->value => DividerResolver::class,
        BlockType::IMAGE->value => ImageResolver::class,
        BlockType::CALLOUT->value => CalloutResolver::class,
    ];

    /**
     * Resuelve la data de un bloque individual con caché en Redis (TTL 5 min).
     */
    public function resolve(ReportBlock $block, array $scope = []): array
    {
        // Para bloques de contenido estático no cacheamos en Redis
        if (in_array($block->type, [BlockType::NARRATIVE, BlockType::DIVIDER, BlockType::IMAGE, BlockType::CALLOUT], true)) {
            return $this->runResolver($block, $scope);
        }

        $cacheKey = 'report_block:'.$block->id.':'.md5(json_encode($scope).json_encode($block->config));

        return Cache::remember($cacheKey, 300, function () use ($block, $scope) {
            return $this->runResolver($block, $scope);
        });
    }

    /**
     * Resuelve la data de todos los bloques visibles del reporte.
     */
    public function resolveAll(WorkspaceReport $report, array $scope = []): array
    {
        $report->load('blocks');
        $result = [];

        foreach ($report->blocks->where('is_visible', true) as $block) {
            $result[$block->id] = $this->resolve($block, $scope);
        }

        return $result;
    }

    /**
     * Ejecuta el resolver correspondiente al tipo de bloque.
     */
    protected function runResolver(ReportBlock $block, array $scope): array
    {
        $resolverClass = $this->resolvers[$block->type->value] ?? null;

        if (! $resolverClass) {
            // Bloque sin resolver implementado aún
            return ['message' => 'Resolver no implementado para tipo: '.$block->type->value];
        }

        $resolver = app($resolverClass);

        return $resolver->resolve($block, $scope);
    }

    /**
     * Invalida el caché de un bloque específico.
     */
    public function invalidateBlock(ReportBlock $block): void
    {
        Cache::forget('report_block:'.$block->id.':*');
    }
}
