<?php

namespace App\Services\Reports;

use App\Enums\BlockType;
use App\Models\ReportBlock;
use App\Models\WorkspaceReport;

class ReportHtmlRenderer
{
    /**
     * Renderiza un documento HTML autosuficiente y optimizado para exportación visual 1:1.
     */
    public function render(WorkspaceReport $report, array $resolvedData = [], bool $includeInflowFooter = false): string
    {
        $theme = $report->theme ?? [];
        $primaryColor = $theme['primaryColor'] ?? '#6366f1';
        $accentColor = $theme['accentColor'] ?? '#8b5cf6';
        $bgColor = $theme['backgroundColor'] ?? '#ffffff';
        $surfaceColor = $theme['surfaceColor'] ?? '#f8fafc';
        $textColor = $theme['textColor'] ?? '#0f172a';
        $fontFamily = $theme['fontFamily'] ?? 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        $borderRadius = $theme['borderRadius'] ?? '12px';

        $blocks = $report->blocks()->where('is_visible', true)->orderBy('position')->get();

        $blocksHtml = '';
        foreach ($blocks as $block) {
            $data = $resolvedData[$block->id] ?? [];
            $blocksHtml .= $this->renderBlock($block, $data, $primaryColor);
        }

        $createdAt = $report->created_at ? $report->created_at->format('d/m/Y H:i') : date('d/m/Y H:i');
        $workspaceName = htmlspecialchars($report->workspace?->name ?? 'Workspace');
        $reportTitle = htmlspecialchars($report->title);
        $reportDesc = $report->description ? htmlspecialchars($report->description) : '';

        $footerHtml = $includeInflowFooter ? <<<'HTML'
        <footer class="footer">
            <span>Generado con Plane Reports &bull; Reporte Ejecutivo</span>
        </footer>
HTML : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$reportTitle}</title>
    <style>
        @page {
            size: A4;
            margin: 12mm 14mm 16mm 14mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            margin: 0;
            padding: 24px;
            font-family: {$fontFamily};
            background-color: {$bgColor};
            color: {$textColor};
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 1040px;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 24px;
            padding-bottom: 18px;
            border-bottom: 1.5px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .header-title {
            margin: 0;
            font-size: 26px;
            font-weight: 800;
            color: {$textColor};
            letter-spacing: -0.02em;
        }
        .header-meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 6px;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-radius: 6px;
            background: #e0e7ff;
            color: {$primaryColor};
            margin-bottom: 8px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 16px;
            margin-bottom: 20px;
            width: 100%;
        }
        .col-12 { grid-column: span 12; width: 100%; }
        .col-8  { grid-column: span 8; width: 100%; }
        .col-6  { grid-column: span 6; width: 100%; }
        .col-4  { grid-column: span 4; width: 100%; }

        .card {
            background: {$surfaceColor};
            border: 1px solid #e2e8f0;
            border-radius: {$borderRadius};
            padding: 16px 18px;
            page-break-inside: avoid;
            break-inside: avoid;
            width: 100%;
            height: auto;
            min-height: auto;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow: visible;
        }

        .card.card-large {
            page-break-inside: auto;
            break-inside: auto;
        }
        .card.card-large .card-header {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .story-card, .table-row, .work-item-row, .member-card, .activity-item, .risk-card {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 12px;
        }
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            flex-shrink: 0;
        }
        .card-body {
            flex: 1 1 auto;
            width: 100%;
            overflow: visible;
        }
        .card-title {
            margin: 0;
            font-size: 13px;
            font-weight: 700;
            color: {$textColor};
        }
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 12px;
        }
        .kpi-item {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            text-align: left;
        }
        .kpi-label {
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .kpi-value {
            font-size: 22px;
            font-weight: 800;
            color: {$textColor};
        }
        .kpi-delta {
            font-size: 10px;
            font-weight: 600;
            margin-top: 4px;
        }
        .delta-positive { color: #10b981; }
        .delta-negative { color: #ef4444; }

        .table-custom {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        .table-custom th {
            text-align: left;
            padding: 8px 10px;
            background: #f1f5f9;
            color: #475569;
            font-weight: 700;
            border-bottom: 1.5px solid #cbd5e1;
        }
        .table-custom td {
            padding: 8px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: {$textColor};
        }
        .progress-bar-bg {
            background: #e2e8f0;
            border-radius: 9999px;
            height: 7px;
            overflow: hidden;
            width: 100%;
        }
        .progress-bar-fill {
            height: 100%;
            border-radius: 9999px;
            background: {$primaryColor};
        }
        .status-pill {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 9999px;
            font-size: 9px;
            font-weight: 700;
        }
        .status-green { background: #dcfce7; color: #166534; }
        .status-yellow { background: #fef9c3; color: #854d0e; }
        .status-red { background: #fee2e2; color: #991b1b; }
        .status-blue { background: #dbeafe; color: #1e40af; }
        .status-gray { background: #f1f5f9; color: #475569; }

        .priority-pill {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .priority-urgent { background: #fee2e2; color: #991b1b; }
        .priority-high { background: #ffedd5; color: #9a3412; }
        .priority-medium { background: #fef9c3; color: #854d0e; }
        .priority-low { background: #e0f2fe; color: #075985; }
        .priority-none { background: #f1f5f9; color: #64748b; }

        .avatar-circle {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #e0e7ff;
            color: #4338ca;
            font-size: 10px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .footer {
            margin-top: 32px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body>
    <div class="container" id="report-render-ready">
        <header class="header">
            <div>
                <span class="badge">{$workspaceName}</span>
                <h1 class="header-title">{$reportTitle}</h1>
                <div class="header-meta">
                    <span>Generado el {$createdAt}</span>
                    {$this->renderOptionalDesc($reportDesc)}
                </div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
                <strong>Estado:</strong> Publicado
            </div>
        </header>

        <main class="grid">
            {$blocksHtml}
        </main>

        {$footerHtml}
    </div>
</body>
</html>
HTML;
    }

    private function renderOptionalDesc(string $desc): string
    {
        if (empty($desc)) {
            return '';
        }

        return '<p style="margin: 6px 0 0 0; color: #475569; font-size: 12px; max-width: 700px;">'.$desc.'</p>';
    }

    private function renderBlock(ReportBlock $block, array $data, string $primaryColor = '#6366f1'): string
    {
        // Si es separador, no necesita tarjeta contenedora
        if ($block->type === BlockType::DIVIDER) {
            return '<div class="col-12">'.$this->renderDivider($block, $data).'</div>';
        }

        $widthClass = match ($block->width) {
            12 => 'col-12',
            8 => 'col-8',
            6 => 'col-6',
            4 => 'col-4',
            default => 'col-12',
        };

        $isLargeBlock = in_array($block->type, [
            BlockType::USER_STORIES_EVIDENCES,
            BlockType::WORK_ITEMS_LIST,
            BlockType::TABLE,
            BlockType::PROJECT_MEMBERS,
            BlockType::MEMBER_WORKLOAD_BREAKDOWN,
            BlockType::RECENT_ACTIVITY,
        ], true);

        $cardClass = $isLargeBlock ? 'card card-large' : 'card';
        $title = htmlspecialchars($block->title ?? $block->type->label());
        $body = $this->renderBlockBody($block, $data, $primaryColor);

        return <<<HTML
        <div class="{$widthClass}">
            <div class="{$cardClass}">
                <div class="card-header">
                    <h3 class="card-title">{$title}</h3>
                </div>
                <div class="card-body">
                    {$body}
                </div>
            </div>
        </div>
HTML;
    }

    private function renderBlockBody(ReportBlock $block, array $data, string $primaryColor = '#6366f1'): string
    {
        return match ($block->type) {
            BlockType::KPI_ROW => $this->renderKpiRow($data, $primaryColor),
            BlockType::NARRATIVE => $this->renderNarrative($block, $data),
            BlockType::PROJECT_SUMMARY => $this->renderProjectSummary($data),
            BlockType::TABLE => $this->renderTable($data),
            BlockType::WORK_ITEMS_LIST => $this->renderWorkItemsList($data),
            BlockType::CYCLES_OVERVIEW => $this->renderCyclesOverview($data),
            BlockType::CALLOUT => $this->renderCallout($block, $data),
            BlockType::LINE_CHART => $this->renderLineChart($block, $data, $primaryColor),
            BlockType::BAR_CHART => $this->renderBarChart($block, $data),
            BlockType::AREA_CHART => $this->renderAreaChart($block, $data, $primaryColor),
            BlockType::DONUT_CHART => $this->renderDonutChart($block, $data),
            BlockType::TEAM_WORKLOAD => $this->renderTeamWorkload($data),
            BlockType::HEATMAP => $this->renderHeatmap($data),
            BlockType::MILESTONES_PROGRESS => $this->renderMilestonesProgress($data),
            BlockType::RELEASES_TIMELINE => $this->renderReleasesTimeline($data),
            BlockType::RECENT_ACTIVITY => $this->renderRecentActivity($data),
            BlockType::RISKS_BLOCKERS => $this->renderRisksBlockers($data),
            BlockType::IMAGE => $this->renderImage($block, $data),
            BlockType::PROJECT_MEMBERS => $this->renderProjectMembers($data),
            BlockType::MEMBER_WORKLOAD_BREAKDOWN => $this->renderMemberWorkloadBreakdown($data, $primaryColor),
            BlockType::SPRINT_BURNDOWN => $this->renderSprintBurndown($block, $data, $primaryColor),
            BlockType::USER_STORIES_EVIDENCES => $this->renderUserStoriesEvidences($data),
            default => '<div style="font-size:11px;color:#64748b;">Visualización de bloque generada correctamente.</div>',
        };
    }

    // =========================================================================
    // 1. KPI_ROW
    // =========================================================================
    private function renderKpiRow(array $data, string $primaryColor): string
    {
        $kpis = $data['kpis'] ?? [];
        if (empty($kpis)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin datos de KPIs</p>';
        }

        $sparklinePoints = $data['sparkline'] ?? [];

        $html = '<div class="kpi-grid">';
        foreach ($kpis as $k) {
            $val = htmlspecialchars((string) ($k['value'] ?? '0'));
            $label = htmlspecialchars((string) ($k['label'] ?? 'Métrica'));
            $icon = $k['icon'] ?? '📊';
            $delta = $k['delta_percent'] ?? null;
            $deltaHtml = '';
            if ($delta !== null) {
                $cls = $delta >= 0 ? 'delta-positive' : 'delta-negative';
                $sign = $delta >= 0 ? '+' : '';
                $deltaHtml = "<div class=\"kpi-delta {$cls}\">{$sign}{$delta}% vs anterior</div>";
            }

            // Minigráfico Sparkline SVG (últimos 7 días)
            $sparklineHtml = '';
            if (! empty($sparklinePoints) && count($sparklinePoints) >= 2) {
                $values = array_map(fn ($p) => (int) ($p['value'] ?? 0), $sparklinePoints);
                $maxV = max($values) ?: 1;
                $w = 120;
                $h = 24;
                $step = $w / (count($values) - 1);
                $pts = [];
                foreach ($values as $i => $v) {
                    $x = round($i * $step, 1);
                    $y = round($h - (($v / $maxV) * ($h - 4)) - 2, 1);
                    $pts[] = "{$x},{$y}";
                }
                $polyStr = implode(' ', $pts);
                $sparklineHtml = "
                <div style=\"margin-top:6px;height:{$h}px;\">
                    <svg width=\"100%\" height=\"{$h}\" viewBox=\"0 0 {$w} {$h}\" style=\"overflow:visible;\">
                        <polyline fill=\"none\" stroke=\"{$primaryColor}\" stroke-width=\"1.8\" points=\"{$polyStr}\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\"0.7\"></polyline>
                    </svg>
                </div>";
            }

            $html .= "
            <div class=\"kpi-item\">
                <div class=\"kpi-label\">{$icon} {$label}</div>
                <div class=\"kpi-value\">{$val}</div>
                {$deltaHtml}
                {$sparklineHtml}
            </div>";
        }
        $html .= '</div>';

        return $html;
    }

    // =========================================================================
    // 2. NARRATIVE
    // =========================================================================
    private function renderNarrative(ReportBlock $block, array $data): string
    {
        $content = $data['content'] ?? ($block->config['content'] ?? '');

        return "<div style=\"font-size:12px;line-height:1.6;\">{$content}</div>";
    }

    // =========================================================================
    // 3. PROJECT_SUMMARY
    // =========================================================================
    private function renderProjectSummary(array $data): string
    {
        $projects = $data['projects'] ?? [];
        if (empty($projects)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin proyectos seleccionados</p>';
        }

        $html = '<div style="display:flex;flex-direction:column;gap:10px;">';
        foreach ($projects as $p) {
            $pName = htmlspecialchars($p['name'] ?? 'Proyecto');
            $prog = (int) ($p['progress'] ?? 0);
            $health = $p['health'] ?? 'on_track';
            $healthBadge = match ($health) {
                'on_track' => '<span class="status-pill status-green">En Tiempo</span>',
                'at_risk' => '<span class="status-pill status-yellow">En Riesgo</span>',
                default => '<span class="status-pill status-red">Retrasado</span>',
            };
            $completed = (int) ($p['completed_items'] ?? 0);
            $total = (int) ($p['total_items'] ?? 0);

            $html .= "
            <div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px;\">
                <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\">
                    <span style=\"font-weight:700;font-size:12px;\">{$pName}</span>
                    <div style=\"display:flex;align-items:center;gap:8px;\">
                        <span style=\"font-size:10px;color:#64748b;\">{$completed}/{$total} ítems</span>
                        {$healthBadge}
                    </div>
                </div>
                <div style=\"display:flex;align-items:center;gap:10px;\">
                    <div class=\"progress-bar-bg\"><div class=\"progress-bar-fill\" style=\"width:{$prog}%\"></div></div>
                    <span style=\"font-size:11px;font-weight:700;min-width:32px;\">{$prog}%</span>
                </div>
            </div>";
        }
        $html .= '</div>';

        return $html;
    }

    // =========================================================================
    // 4. CYCLES_OVERVIEW
    // =========================================================================
    private function renderCyclesOverview(array $data): string
    {
        $cycles = $data['cycles'] ?? [];
        if (empty($cycles)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin ciclos configurados</p>';
        }

        $html = '<div style="display:flex;flex-direction:column;gap:8px;">';
        foreach ($cycles as $c) {
            $name = htmlspecialchars($c['name'] ?? 'Ciclo');
            $prog = (int) ($c['progress'] ?? 0);
            $start = $c['start_date'] ?? '';
            $end = $c['end_date'] ?? '';
            $dateRange = ($start && $end) ? "{$start} &rarr; {$end}" : '';
            $total = (int) ($c['total_items'] ?? 0);
            $completed = (int) ($c['completed_items'] ?? 0);

            $html .= "
            <div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;\">
                <div style=\"display:flex;justify-content:space-between;font-size:11px;font-weight:600;margin-bottom:4px;\">
                    <span style=\"color:#0f172a;\">{$name}</span>
                    <span style=\"color:#6366f1;font-weight:700;\">{$prog}%</span>
                </div>
                <div class=\"progress-bar-bg\" style=\"margin-bottom:6px;\"><div class=\"progress-bar-fill\" style=\"width:{$prog}%\"></div></div>
                <div style=\"display:flex;justify-content:space-between;font-size:10px;color:#64748b;\">
                    <span>{$dateRange}</span>
                    <span>{$completed}/{$total} tareas completadas</span>
                </div>
            </div>";
        }
        $html .= '</div>';

        return $html;
    }

    // =========================================================================
    // 5. TABLE & WORK_ITEMS_LIST
    // =========================================================================
    private function renderTable(array $data): string
    {
        $items = $data['rows'] ?? ($data['items'] ?? []);
        if (empty($items)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin registros disponibles</p>';
        }

        $html = '<table class="table-custom"><thead><tr>';
        $html .= '<th style="width:75px;">ID</th><th>Título</th><th>Estado</th><th>Prioridad</th><th>Responsable</th>';
        $html .= '</tr></thead><tbody>';

        foreach (array_slice($items, 0, 10) as $item) {
            $identifier = htmlspecialchars($item['identifier'] ?? ('#'.($item['id'] ?? '')));
            $title = htmlspecialchars($item['title'] ?? ($item['name'] ?? 'Ítem'));
            $stateName = htmlspecialchars($item['state']['name'] ?? ($item['state'] ?? 'Abierto'));
            $priority = $item['priority'] ?? 'NONE';
            $prioLabel = $this->priorityLabel($priority);
            $prioClass = $this->priorityClass($priority);

            // Mapear lead o assignee
            $assigneeName = htmlspecialchars(
                $item['lead']['name'] ?? ($item['assignee']['name'] ?? ($item['lead'] ?? 'Sin asignar'))
            );

            $html .= "
            <tr>
                <td><span style=\"font-family:monospace;font-size:10px;color:#64748b;font-weight:600;\">{$identifier}</span></td>
                <td style=\"font-weight:600;\">{$title}</td>
                <td><span class=\"status-pill status-blue\">{$stateName}</span></td>
                <td><span class=\"priority-pill {$prioClass}\">{$prioLabel}</span></td>
                <td><span style=\"font-size:10px;color:#475569;\">{$assigneeName}</span></td>
            </tr>";
        }
        $html .= '</tbody></table>';

        return $html;
    }

    private function renderWorkItemsList(array $data): string
    {
        return $this->renderTable($data);
    }

    // =========================================================================
    // 6. CALLOUT
    // =========================================================================
    private function renderCallout(ReportBlock $block, array $data): string
    {
        $text = htmlspecialchars($data['text'] ?? ($block->config['text'] ?? 'Nota importante'));

        return "<div style=\"background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 14px;border-radius:6px;font-size:12px;color:#1e3a8a;line-height:1.5;\">{$text}</div>";
    }

    // =========================================================================
    // 7. LINE_CHART
    // =========================================================================
    private function renderLineChart(ReportBlock $block, array $data, string $primaryColor): string
    {
        $series = $data['series'] ?? [];
        $points = $series[0]['data'] ?? [];

        if (empty($points)) {
            return '<div style="height:120px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">Sin datos para el período seleccionado</div>';
        }

        $slicePoints = array_slice($points, -14); // últimos 14 puntos para claridad
        $values = array_map(fn ($p) => (int) ($p['value'] ?? 0), $slicePoints);
        $maxVal = max($values) ?: 1;

        $w = 540;
        $h = 140;
        $padLeft = 32;
        $padRight = 16;
        $padTop = 16;
        $padBottom = 26;
        $plotW = $w - $padLeft - $padRight;
        $plotH = $h - $padTop - $padBottom;

        $step = count($slicePoints) > 1 ? $plotW / (count($slicePoints) - 1) : $plotW;

        $coordPoints = [];
        foreach ($values as $i => $val) {
            $x = round($padLeft + ($i * $step), 1);
            $y = round($padTop + $plotH - (($val / $maxVal) * $plotH), 1);
            $coordPoints[] = ['x' => $x, 'y' => $y, 'val' => $val, 'date' => $slicePoints[$i]['date'] ?? ''];
        }

        $polyLinePoints = implode(' ', array_map(fn ($c) => "{$c['x']},{$c['y']}", $coordPoints));
        $firstX = $coordPoints[0]['x'];
        $lastX = $coordPoints[count($coordPoints) - 1]['x'];
        $bottomY = $padTop + $plotH;
        $areaPoints = "{$firstX},{$bottomY} ".$polyLinePoints." {$lastX},{$bottomY}";

        $circlesHtml = '';
        $xLabelsHtml = '';
        foreach ($coordPoints as $idx => $pt) {
            $circlesHtml .= "<circle cx=\"{$pt['x']}\" cy=\"{$pt['y']}\" r=\"3.5\" fill=\"#ffffff\" stroke=\"{$primaryColor}\" stroke-width=\"2\" />";
            if ($idx % 2 === 0 || $idx === count($coordPoints) - 1) {
                $d = htmlspecialchars(substr($pt['date'], -5));
                $xLabelsHtml .= "<text x=\"{$pt['x']}\" y=\"{$h}\" font-size=\"8.5\" fill=\"#94a3b8\" text-anchor=\"middle\">{$d}</text>";
            }
        }

        return "
        <div style=\"width:100%;height:150px;padding-top:4px;\">
            <svg width=\"100%\" height=\"{$h}\" viewBox=\"0 0 {$w} {$h}\" style=\"overflow:visible;\">
                <defs>
                    <linearGradient id=\"lineAreaGrad_{$block->id}\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
                        <stop offset=\"0%\" stop-color=\"{$primaryColor}\" stop-opacity=\"0.28\" />
                        <stop offset=\"100%\" stop-color=\"{$primaryColor}\" stop-opacity=\"0.0\" />
                    </linearGradient>
                </defs>
                <line x1=\"{$padLeft}\" y1=\"{$padTop}\" x2=\"{$w}\" y2=\"{$padTop}\" stroke=\"#f1f5f9\" stroke-width=\"1\" stroke-dasharray=\"3 3\" />
                <line x1=\"{$padLeft}\" y1=\"{$bottomY}\" x2=\"{$w}\" y2=\"{$bottomY}\" stroke=\"#cbd5e1\" stroke-width=\"1\" />
                <text x=\"0\" y=\"{$padTop}\" font-size=\"8.5\" fill=\"#94a3b8\" text-anchor=\"start\">{$maxVal}</text>
                <text x=\"0\" y=\"{$bottomY}\" font-size=\"8.5\" fill=\"#94a3b8\" text-anchor=\"start\">0</text>
                <polygon fill=\"url(#lineAreaGrad_{$block->id})\" points=\"{$areaPoints}\" />
                <polyline fill=\"none\" stroke=\"{$primaryColor}\" stroke-width=\"2.5\" points=\"{$polyLinePoints}\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />
                {$circlesHtml}
                {$xLabelsHtml}
            </svg>
        </div>";
    }

    // =========================================================================
    // 8. BAR_CHART
    // =========================================================================
    private function renderBarChart(ReportBlock $block, array $data): string
    {
        $items = $data['data'] ?? [];
        if (empty($items)) {
            return '<div style="height:120px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">Sin datos para el gráfico de barras</div>';
        }

        $maxVal = max(array_map(fn ($it) => (float) ($it['value'] ?? 0), $items)) ?: 1;

        $html = '<div style="display:flex;align-items:flex-end;gap:12px;height:140px;padding:12px 10px 0 10px;border-bottom:1.5px solid #e2e8f0;">';
        foreach ($items as $it) {
            $val = (float) ($it['value'] ?? 0);
            $name = htmlspecialchars($it['name'] ?? '');
            $color = $it['color'] ?? '#6366f1';
            $hPct = max(6, round(($val / $maxVal) * 100));

            $html .= "
            <div style=\"flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;\">
                <span style=\"font-size:10px;font-weight:700;color:#334155;\">{$val}</span>
                <div style=\"width:100%;max-width:44px;height:{$hPct}%;background:{$color};border-radius:4px 4px 0 0;\"></div>
                <span style=\"font-size:9px;color:#64748b;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55px;\" title=\"{$name}\">{$name}</span>
            </div>";
        }
        $html .= '</div>';

        return $html;
    }

    // =========================================================================
    // 9. AREA_CHART (Flujo de Trabajo: Creadas vs Completadas)
    // =========================================================================
    private function renderAreaChart(ReportBlock $block, array $data, string $primaryColor = '#6366f1'): string
    {
        $series = $data['series'] ?? [];
        if (empty($series)) {
            return '<div style="height:140px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">Sin datos de velocidad / flujo de trabajo</div>';
        }

        // Muestrear últimos 14 puntos
        $points = array_slice($series, -14);
        $createdVals = array_map(fn ($p) => (int) ($p['created'] ?? 0), $points);
        $completedVals = array_map(fn ($p) => (int) ($p['completed'] ?? 0), $points);
        $rawMax = max(max($createdVals ?: [1]), max($completedVals ?: [1])) ?: 1;
        $maxVal = $rawMax <= 5 ? 5 : ($rawMax <= 10 ? 10 : ceil($rawMax / 5) * 5);

        $w = 760;
        $h = 240;
        $padLeft = 45;
        $padRight = 20;
        $padTop = 20;
        $padBottom = 35;
        $plotW = $w - $padLeft - $padRight;
        $plotH = $h - $padTop - $padBottom;
        $bottomY = $padTop + $plotH;

        $step = count($points) > 1 ? $plotW / (count($points) - 1) : $plotW;

        $cPoints = [];
        $compPoints = [];
        $xTicksHtml = '';
        $dotsHtml = '';

        foreach ($points as $i => $pt) {
            $x = round($padLeft + ($i * $step), 1);
            $yC = round($padTop + $plotH - (($pt['created'] / $maxVal) * $plotH), 1);
            $yComp = round($padTop + $plotH - (($pt['completed'] / $maxVal) * $plotH), 1);
            $cPoints[] = "{$x},{$yC}";
            $compPoints[] = "{$x},{$yComp}";

            $dateLabel = htmlspecialchars($pt['date'] ?? '');
            $xTicksHtml .= "<text x=\"{$x}\" y=\"".($bottomY + 18)."\" text-anchor=\"middle\" font-size=\"11px\" fill=\"#9ca3af\" font-family=\"sans-serif\">{$dateLabel}</text>";
            $dotsHtml .= "<circle cx=\"{$x}\" cy=\"{$yC}\" r=\"3\" fill=\"#ffffff\" stroke=\"#6366f1\" stroke-width=\"2\" />";
            $dotsHtml .= "<circle cx=\"{$x}\" cy=\"{$yComp}\" r=\"3\" fill=\"#ffffff\" stroke=\"#10b981\" stroke-width=\"2\" />";
        }

        $cPolyStr = implode(' ', $cPoints);
        $compPolyStr = implode(' ', $compPoints);
        $firstX = round($padLeft, 1);
        $lastX = round($padLeft + ((count($points) - 1) * $step), 1);

        $cAreaStr = "{$firstX},{$bottomY} {$cPolyStr} {$lastX},{$bottomY}";
        $compAreaStr = "{$firstX},{$bottomY} {$compPolyStr} {$lastX},{$bottomY}";

        // Ticks del eje Y
        $yTicks = [0, round($maxVal * 0.25), round($maxVal * 0.5), round($maxVal * 0.75), $maxVal];
        $yTicksHtml = '';
        foreach ($yTicks as $tick) {
            $y = round($padTop + $plotH - (($tick / $maxVal) * $plotH), 1);
            $yTicksHtml .= "<line x1=\"{$padLeft}\" y1=\"{$y}\" x2=\"".($w - $padRight)."\" y2=\"{$y}\" stroke=\"#e5e7eb\" stroke-dasharray=\"3 3\" stroke-width=\"1\" />";
            $yTicksHtml .= '<text x="'.($padLeft - 10).'" y="'.($y + 4)."\" text-anchor=\"end\" font-size=\"11px\" fill=\"#9ca3af\" font-family=\"sans-serif\">{$tick}</text>";
        }

        $totalCreated = array_sum(array_column($series, 'created'));
        $totalCompleted = array_sum(array_column($series, 'completed'));

        return "
        <div>
            <div style=\"display:flex;gap:18px;justify-content:flex-end;font-size:11px;margin-bottom:10px;font-family:sans-serif;\">
                <span style=\"display:flex;align-items:center;gap:6px;\">
                    <span style=\"width:10px;height:10px;border-radius:2px;background:#6366f1;display:inline-block;\"></span>
                    Creadas: <strong style=\"color:#1e293b;\">{$totalCreated}</strong>
                </span>
                <span style=\"display:flex;align-items:center;gap:6px;\">
                    <span style=\"width:10px;height:10px;border-radius:2px;background:#10b981;display:inline-block;\"></span>
                    Completadas: <strong style=\"color:#1e293b;\">{$totalCompleted}</strong>
                </span>
            </div>
            <div style=\"width:100%;height:auto;\">
                <svg width=\"100%\" height=\"{$h}\" viewBox=\"0 0 {$w} {$h}\" style=\"overflow:visible;display:block;\">
                    <defs>
                        <linearGradient id=\"colorCreatedPdf\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
                            <stop offset=\"5%\" stop-color=\"#6366f1\" stop-opacity=\"0.35\" />
                            <stop offset=\"95%\" stop-color=\"#6366f1\" stop-opacity=\"0.0\" />
                        </linearGradient>
                        <linearGradient id=\"colorCompletedPdf\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
                            <stop offset=\"5%\" stop-color=\"#10b981\" stop-opacity=\"0.35\" />
                            <stop offset=\"95%\" stop-color=\"#10b981\" stop-opacity=\"0.0\" />
                        </linearGradient>
                    </defs>
                    {$yTicksHtml}
                    <line x1=\"{$padLeft}\" y1=\"{$bottomY}\" x2=\"".($w - $padRight)."\" y2=\"{$bottomY}\" stroke=\"#cbd5e1\" stroke-width=\"1.5\" />
                    <polygon fill=\"url(#colorCreatedPdf)\" points=\"{$cAreaStr}\" />
                    <polyline fill=\"none\" stroke=\"#6366f1\" stroke-width=\"2.5\" points=\"{$cPolyStr}\" stroke-linejoin=\"round\" />
                    <polygon fill=\"url(#colorCompletedPdf)\" points=\"{$compAreaStr}\" />
                    <polyline fill=\"none\" stroke=\"#10b981\" stroke-width=\"2.5\" points=\"{$compPolyStr}\" stroke-linejoin=\"round\" />
                    {$dotsHtml}
                    {$xTicksHtml}
                </svg>
            </div>
        </div>";
    }

    // =========================================================================
    // 10. DONUT_CHART
    // =========================================================================
    private function renderDonutChart(ReportBlock $block, array $data): string
    {
        $segments = $data['segments'] ?? [];
        if (empty($segments)) {
            return '<div style="height:120px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">Sin datos para el gráfico circular</div>';
        }

        $total = array_sum(array_map(fn ($s) => (float) ($s['value'] ?? 0), $segments));

        $html = '<div style="display:flex;align-items:center;justify-content:space-around;gap:20px;padding:8px 0;">';
        $html .= '<div style="position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center;">';
        $html .= '<svg width="120" height="120" viewBox="0 0 36 36" style="transform:rotate(-90deg);">';

        $offset = 0;
        foreach ($segments as $s) {
            $pct = (float) ($s['percentage'] ?? 0);
            $color = $s['color'] ?? '#6366f1';
            $dash = "{$pct} ".(100 - $pct);
            $html .= "<circle cx=\"18\" cy=\"18\" r=\"15.9\" fill=\"transparent\" stroke=\"{$color}\" stroke-width=\"4\" stroke-dasharray=\"{$dash}\" stroke-dashoffset=\"-{$offset}\"></circle>";
            $offset += $pct;
        }

        $html .= '</svg>';
        $html .= "<div style=\"position:absolute;text-align:center;\"><span style=\"font-size:18px;font-weight:800;color:#0f172a;\">{$total}</span><br><span style=\"font-size:9px;color:#94a3b8;\">TOTAL</span></div>";
        $html .= '</div>';

        // Leyenda
        $html .= '<div style="display:flex;flex-direction:column;gap:6px;font-size:11px;min-width:140px;">';
        foreach ($segments as $s) {
            $name = htmlspecialchars($s['name'] ?? ($s['label'] ?? ''));
            $color = $s['color'] ?? '#6366f1';
            $val = $s['value'] ?? ($s['count'] ?? 0);
            $pct = $s['percentage'] ?? 0;
            $html .= "
            <div style=\"display:flex;align-items:center;justify-content:space-between;gap:8px;\">
                <span style=\"display:flex;align-items:center;gap:6px;\">
                    <span style=\"width:10px;height:10px;border-radius:2px;background:{$color};display:inline-block;\"></span>
                    <span style=\"color:#475569;\">{$name}</span>
                </span>
                <span style=\"font-weight:700;\">{$val} <small style=\"color:#94a3b8;font-weight:normal;\">({$pct}%)</small></span>
            </div>";
        }
        $html .= '</div></div>';

        return $html;
    }

    // =========================================================================
    // 11. TEAM_WORKLOAD
    // =========================================================================
    private function renderTeamWorkload(array $data): string
    {
        $members = $data['members'] ?? [];
        if (empty($members)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin datos de carga de trabajo asignada</p>';
        }

        $maxAssigned = max(array_map(fn ($m) => (int) ($m['total_assigned'] ?? 0), $members)) ?: 1;

        $html = '<div style="display:flex;flex-direction:column;gap:10px;">';
        foreach (array_slice($members, 0, 8) as $m) {
            $name = htmlspecialchars($m['name'] ?? 'Miembro');
            $initials = strtoupper(substr($name, 0, 2));
            $active = (int) ($m['active_items'] ?? 0);
            $completed = (int) ($m['completed_items'] ?? 0);
            $total = (int) ($m['total_assigned'] ?? 0);
            $loadStatus = $m['load_status'] ?? 'balanced';

            $statusPill = match ($loadStatus) {
                'overloaded' => '<span class="status-pill status-red">Sobrecargado</span>',
                'heavy' => '<span class="status-pill status-yellow">Carga Alta</span>',
                'balanced' => '<span class="status-pill status-blue">Equilibrado</span>',
                default => '<span class="status-pill status-green">Ligero</span>',
            };

            $barPct = round(($total / $maxAssigned) * 100);

            $html .= "
            <div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;\">
                <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\">
                    <div style=\"display:flex;align-items:center;gap:8px;\">
                        <span class=\"avatar-circle\">{$initials}</span>
                        <span style=\"font-size:11px;font-weight:700;\">{$name}</span>
                    </div>
                    <div style=\"display:flex;align-items:center;gap:8px;\">
                        <span style=\"font-size:10px;color:#64748b;\">{$active} activas &bull; {$completed} completadas</span>
                        {$statusPill}
                    </div>
                </div>
                <div class=\"progress-bar-bg\"><div class=\"progress-bar-fill\" style=\"width:{$barPct}%;background:#3b82f6;\"></div></div>
            </div>";
        }
        $html .= '</div>';

        return $html;
    }

    // =========================================================================
    // 12. HEATMAP
    // =========================================================================
    private function renderHeatmap(array $data): string
    {
        $matrix = $data['matrix'] ?? [];
        if (empty($matrix)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin actividad registrada en el período</p>';
        }

        $totalEvents = (int) ($data['total_events'] ?? 0);
        $period = $data['period'] ?? [];
        $from = $period['from'] ?? '';
        $to = $period['to'] ?? '';
        $periodLabel = ($from && $to) ? "{$from} al {$to}" : 'Último trimestre';

        $levelColors = [
            0 => '#ebedf0',
            1 => '#9be9a8',
            2 => '#40c463',
            3 => '#30a14e',
            4 => '#216e39',
        ];

        // Agrupar matriz en semanas (columnas de 7 días)
        $weeks = array_chunk($matrix, 7);
        $dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        $monthNames = [
            'Jan' => 'Ene', 'Feb' => 'Feb', 'Mar' => 'Mar', 'Apr' => 'Abr',
            'May' => 'May', 'Jun' => 'Jun', 'Jul' => 'Jul', 'Aug' => 'Ago',
            'Sep' => 'Sep', 'Oct' => 'Oct', 'Nov' => 'Nov', 'Dec' => 'Dic',
        ];

        // Fila superior de meses
        $monthHeaderHtml = '';
        $lastMonth = '';
        foreach ($weeks as $w) {
            $firstDay = $w[0] ?? null;
            $monthText = '';
            if ($firstDay && ! empty($firstDay['date'])) {
                $rawMonth = date('M', strtotime($firstDay['date']));
                $esMonth = $monthNames[$rawMonth] ?? $rawMonth;
                if ($esMonth !== $lastMonth) {
                    $monthText = $esMonth;
                    $lastMonth = $esMonth;
                }
            }
            $monthHeaderHtml .= "<div style=\"width:10px;font-size:8px;font-weight:600;color:#64748b;overflow:visible;white-space:nowrap;\">{$monthText}</div>";
        }

        // Columna lateral izquierda con los días de la semana
        $daysColumnHtml = '<div style="display:flex;flex-direction:column;gap:3px;margin-right:6px;font-size:8px;font-weight:600;color:#94a3b8;line-height:10px;">';
        foreach ($dayNames as $idx => $d) {
            $label = ($idx % 2 === 1) ? $d : ''; // Muestra Lun, Mié, Vie
            $daysColumnHtml .= "<div style=\"height:10px;display:flex;align-items:center;\">{$label}</div>";
        }
        $daysColumnHtml .= '</div>';

        // Columnas de casillas por semana
        $weeksHtml = '';
        foreach ($weeks as $w) {
            $weeksHtml .= '<div style="display:flex;flex-direction:column;gap:3px;">';
            foreach ($w as $day) {
                $lvl = $day['level'] ?? 0;
                $col = $levelColors[$lvl] ?? $levelColors[0];
                $cnt = $day['count'] ?? 0;
                $dt = $day['date'] ?? '';
                $weeksHtml .= "<div style=\"width:10px;height:10px;border-radius:2px;background:{$col};\" title=\"{$dt}: {$cnt} tareas\"></div>";
            }
            $weeksHtml .= '</div>';
        }

        return "
        <div>
            <!-- Encabezado con meses, días y cuadrícula de calor -->
            <div style=\"overflow-x:auto;padding:6px 0;\">
                <div style=\"display:inline-flex;flex-direction:column;gap:4px;\">
                    <!-- Fila de meses -->
                    <div style=\"display:flex;gap:3px;margin-left:26px;\">
                        {$monthHeaderHtml}
                    </div>
                    <!-- Cuerpo: Días a la izquierda + Semanas -->
                    <div style=\"display:flex;align-items:flex-start;\">
                        {$daysColumnHtml}
                        <div style=\"display:flex;gap:3px;\">
                            {$weeksHtml}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pie con período y escala de actividad -->
            <div style=\"display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#64748b;margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;\">
                <span>{$periodLabel} &bull; <strong>{$totalEvents}</strong> tareas</span>
                <div style=\"display:flex;align-items:center;gap:4px;\">
                    <span>Menos</span>
                    <span style=\"width:9px;height:9px;background:{$levelColors[0]};border-radius:2px;display:inline-block;border:1px solid #e2e8f0;\"></span>
                    <span style=\"width:9px;height:9px;background:{$levelColors[1]};border-radius:2px;display:inline-block;\"></span>
                    <span style=\"width:9px;height:9px;background:{$levelColors[2]};border-radius:2px;display:inline-block;\"></span>
                    <span style=\"width:9px;height:9px;background:{$levelColors[3]};border-radius:2px;display:inline-block;\"></span>
                    <span style=\"width:9px;height:9px;background:{$levelColors[4]};border-radius:2px;display:inline-block;\"></span>
                    <span>Más</span>
                </div>
            </div>
        </div>";
    }

    // =========================================================================
    // 13. MILESTONES_PROGRESS
    // =========================================================================
    private function renderMilestonesProgress(array $data): string
    {
        $milestones = $data['milestones'] ?? [];
        if (empty($milestones)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin hitos programados</p>';
        }

        $html = '<div style="display:flex;flex-direction:column;gap:8px;">';
        foreach ($milestones as $m) {
            $title = htmlspecialchars($m['title'] ?? 'Hito');
            $progress = (int) ($m['progress'] ?? 0);
            $target = $m['target_date'] ?? 'Sin fecha';
            $isOverdue = $m['is_overdue'] ?? false;
            $overdueBadge = $isOverdue ? '<span class="status-pill status-red">Vencido</span>' : '';
            $status = $m['status'] ?? 'PENDING';
            $statusBadge = $status === 'COMPLETED'
                ? '<span class="status-pill status-green">Completado</span>'
                : ($overdueBadge ?: '<span class="status-pill status-blue">En Progreso</span>');

            $html .= "
            <div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;\">
                <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\">
                    <span style=\"font-size:11px;font-weight:700;\">{$title}</span>
                    <div style=\"display:flex;align-items:center;gap:6px;\">
                        <span style=\"font-size:10px;color:#64748b;\">Fecha límite: {$target}</span>
                        {$statusBadge}
                    </div>
                </div>
                <div style=\"display:flex;align-items:center;gap:8px;\">
                    <div class=\"progress-bar-bg\"><div class=\"progress-bar-fill\" style=\"width:{$progress}%;background:#8b5cf6;\"></div></div>
                    <span style=\"font-size:10px;font-weight:700;color:#6366f1;min-width:30px;\">{$progress}%</span>
                </div>
            </div>";
        }
        $html .= '</div>';

        return $html;
    }

    // =========================================================================
    // 14. RELEASES_TIMELINE
    // =========================================================================
    private function renderReleasesTimeline(array $data): string
    {
        $releases = $data['releases'] ?? [];
        if (empty($releases)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin lanzamientos / releases registrados</p>';
        }

        $html = '<div style="display:flex;flex-direction:column;gap:12px;padding-left:14px;border-left:2px solid #e2e8f0;">';
        foreach ($releases as $r) {
            $name = htmlspecialchars($r['name'] ?? 'Release');
            $ver = htmlspecialchars($r['version'] ?? '');
            $status = $r['status'] ?? 'DRAFT';
            $statusBadge = $status === 'PUBLISHED'
                ? '<span class="status-pill status-green">Publicada</span>'
                : '<span class="status-pill status-gray">Borrador</span>';
            $itemsCount = (int) ($r['items_count'] ?? 0);
            $date = $r['published_at'] ? date('d/m/Y', strtotime($r['published_at'])) : ($r['created_at'] ? date('d/m/Y', strtotime($r['created_at'])) : '');

            $html .= "
            <div style=\"position:relative;\">
                <div style=\"position:absolute;left:-21px;top:2px;width:12px;height:12px;border-radius:50%;background:#6366f1;border:2px solid #ffffff;\"></div>
                <div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;\">
                    <div style=\"display:flex;justify-content:space-between;align-items:center;\">
                        <div style=\"display:flex;align-items:center;gap:6px;\">
                            <span style=\"font-size:11px;font-weight:700;\">{$name}</span>
                            ".($ver ? "<span class=\"status-pill status-blue\">{$ver}</span>" : '')."
                        </div>
                        <div style=\"display:flex;align-items:center;gap:6px;\">
                            <span style=\"font-size:10px;color:#94a3b8;\">{$date} &bull; {$itemsCount} tareas</span>
                            {$statusBadge}
                        </div>
                    </div>
                </div>
            </div>";
        }
        $html .= '</div>';

        return $html;
    }

    // =========================================================================
    // 15. RISKS_BLOCKERS
    // =========================================================================
    private function renderRisksBlockers(array $data): string
    {
        $summary = $data['summary'] ?? [];
        $risks = $data['risks'] ?? [];

        $overdue = $summary['overdue'] ?? 0;
        $stagnant = $summary['stagnant'] ?? 0;
        $urgent = $summary['urgent'] ?? 0;

        $html = "
        <div style=\"display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-bottom:12px;\">
            <div style=\"background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px;text-align:center;\">
                <div style=\"font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase;\">Vencidas</div>
                <div style=\"font-size:18px;font-weight:800;color:#dc2626;\">{$overdue}</div>
            </div>
            <div style=\"background:#fef9c3;border:1px solid #fef08a;border-radius:8px;padding:8px 10px;text-align:center;\">
                <div style=\"font-size:9px;font-weight:700;color:#854d0e;text-transform:uppercase;\">Estancadas</div>
                <div style=\"font-size:18px;font-weight:800;color:#ca8a04;\">{$stagnant}</div>
            </div>
            <div style=\"background:#ffedd5;border:1px solid #fed7aa;border-radius:8px;padding:8px 10px;text-align:center;\">
                <div style=\"font-size:9px;font-weight:700;color:#9a3412;text-transform:uppercase;\">Urgentes</div>
                <div style=\"font-size:18px;font-weight:800;color:#ea580c;\">{$urgent}</div>
            </div>
        </div>";

        if (! empty($risks)) {
            $html .= '<div style="display:flex;flex-direction:column;gap:6px;">';
            foreach (array_slice($risks, 0, 5) as $item) {
                $title = htmlspecialchars($item['title'] ?? 'Tarea');
                $target = $item['target_date'] ?? null;
                $priority = $item['priority'] ?? 'NONE';
                $prioClass = $this->priorityClass($priority);
                $prioLabel = $this->priorityLabel($priority);

                $html .= "
                <div style=\"background:#fff;border:1px solid #f1f5f9;border-radius:6px;padding:6px 10px;display:flex;justify-content:space-between;align-items:center;font-size:11px;\">
                    <span style=\"font-weight:600;color:#1e293b;\">{$title}</span>
                    <div style=\"display:flex;align-items:center;gap:6px;\">
                        ".($target ? "<span style=\"color:#ef4444;font-size:10px;\">Vence: {$target}</span>" : '')."
                        <span class=\"priority-pill {$prioClass}\">{$prioLabel}</span>
                    </div>
                </div>";
            }
            $html .= '</div>';
        }

        return $html;
    }

    // =========================================================================
    // 16. RECENT_ACTIVITY
    // =========================================================================
    private function renderRecentActivity(array $data): string
    {
        $activities = $data['activities'] ?? [];
        if (empty($activities)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin actividad reciente</p>';
        }

        $html = '<div style="display:flex;flex-direction:column;gap:6px;">';
        foreach (array_slice($activities, 0, 8) as $a) {
            $actor = htmlspecialchars($a['actor_name'] ?? 'Usuario');
            $initials = strtoupper(substr($actor, 0, 2));
            $action = htmlspecialchars($a['action'] ?? 'actividad');
            $date = $a['created_at'] ? date('d/m H:i', strtotime($a['created_at'])) : '';

            $html .= "
            <div style=\"background:#fff;border:1px solid #f1f5f9;border-radius:6px;padding:6px 10px;display:flex;align-items:center;justify-content:space-between;font-size:10px;\">
                <div style=\"display:flex;align-items:center;gap:6px;\">
                    <span class=\"avatar-circle\" style=\"width:20px;height:20px;font-size:9px;\">{$initials}</span>
                    <span><strong>{$actor}</strong> {$action}</span>
                </div>
                <span style=\"color:#94a3b8;\">{$date}</span>
            </div>";
        }
        $html .= '</div>';

        return $html;
    }

    // =========================================================================
    // 17. DIVIDER
    // =========================================================================
    private function renderDivider(ReportBlock $block, array $data): string
    {
        $style = $data['style'] ?? ($block->config['style'] ?? 'solid');
        $color = $data['color'] ?? ($block->config['color'] ?? '#e2e8f0');
        $h = (int) ($data['height'] ?? ($block->config['height'] ?? 24));

        if ($style === 'space') {
            return "<div style=\"height:{$h}px;\"></div>";
        }
        if ($style === 'dashed') {
            return "<div style=\"height:{$h}px;display:flex;align-items:center;\"><div style=\"width:100%;border-top:1.5px dashed {$color};\"></div></div>";
        }
        if ($style === 'gradient') {
            return "<div style=\"height:{$h}px;display:flex;align-items:center;\"><div style=\"width:100%;height:2px;background:linear-gradient(to right, transparent, {$color}, transparent);\"></div></div>";
        }

        return "<div style=\"height:{$h}px;display:flex;align-items:center;\"><div style=\"width:100%;border-top:1px solid {$color};\"></div></div>";
    }

    // =========================================================================
    // 18. IMAGE
    // =========================================================================
    private function renderImage(ReportBlock $block, array $data): string
    {
        $url = ! empty($data['data_url'])
            ? $data['data_url']
            : htmlspecialchars($data['url'] ?? ($block->config['data_url'] ?? ($block->config['url'] ?? '')));

        if (empty($url)) {
            return '<div style="height:100px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">Imagen sin configurar</div>';
        }

        $alt = htmlspecialchars($data['alt'] ?? ($block->config['alt'] ?? 'Imagen del reporte'));
        $caption = htmlspecialchars($data['caption'] ?? ($block->config['caption'] ?? ''));
        $align = $data['alignment'] ?? ($block->config['alignment'] ?? 'center');
        $maxWidth = htmlspecialchars($data['max_width'] ?? ($block->config['max_width'] ?? '100%'));

        $captionHtml = $caption ? "<figcaption style=\"font-size:10px;color:#64748b;margin-top:6px;\">{$caption}</figcaption>" : '';

        return "
        <figure style=\"margin:0;text-align:{$align};page-break-inside:avoid;break-inside:avoid;width:100%;\">
            <img src=\"{$url}\" alt=\"{$alt}\" style=\"max-width:{$maxWidth};border-radius:6px;max-height:420px;object-fit:contain;display:inline-block;\" />
            {$captionHtml}
        </figure>";
    }

    // =========================================================================
    // 19. PROJECT_MEMBERS
    // =========================================================================
    private function renderProjectMembers(array $data): string
    {
        $members = $data['members'] ?? [];
        if (empty($members)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin integrantes registrados en este proyecto</p>';
        }

        $rows = '';
        foreach ($members as $m) {
            $name = htmlspecialchars($m['name'] ?? 'Miembro');
            $email = htmlspecialchars($m['email'] ?? '');
            $role = htmlspecialchars($m['role'] ?? 'MEMBER');
            $capacity = (float) ($m['capacity_points'] ?? 0);
            $active = (int) ($m['active_assigned'] ?? 0);
            $completed = (int) ($m['completed_assigned'] ?? 0);
            $initial = strtoupper(substr($name, 0, 1));

            $rows .= "
            <tr style=\"border-bottom:1px solid #f1f5f9;\">
                <td style=\"padding:8px;font-size:11px;\">
                    <div style=\"display:flex;align-items:center;gap:8px;\">
                        <div style=\"width:24px;height:24px;border-radius:50%;background:#e0e7ff;color:#4338ca;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:10px;\">{$initial}</div>
                        <div>
                            <div style=\"font-weight:600;color:#1e293b;\">{$name}</div>
                            <div style=\"font-size:10px;color:#64748b;\">{$email}</div>
                        </div>
                    </div>
                </td>
                <td style=\"padding:8px;font-size:11px;text-align:center;\">
                    <span style=\"display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;background:#f8fafc;color:#475569;border:1px solid #e2e8f0;\">{$role}</span>
                </td>
                <td style=\"padding:8px;font-size:11px;text-align:center;font-weight:600;\">{$capacity} pts</td>
                <td style=\"padding:8px;font-size:11px;text-align:center;color:#f59e0b;font-weight:600;\">{$active}</td>
                <td style=\"padding:8px;font-size:11px;text-align:center;color:#10b981;font-weight:600;\">{$completed}</td>
            </tr>";
        }

        return "
        <table style=\"width:100%;border-collapse:collapse;\">
            <thead>
                <tr style=\"background:#f8fafc;border-bottom:1.5px solid #e2e8f0;font-size:10px;color:#64748b;text-transform:uppercase;\">
                    <th style=\"padding:8px;text-align:left;\">Miembro</th>
                    <th style=\"padding:8px;text-align:center;\">Rol</th>
                    <th style=\"padding:8px;text-align:center;\">Capacidad</th>
                    <th style=\"padding:8px;text-align:center;\">Activas</th>
                    <th style=\"padding:8px;text-align:center;\">Completadas</th>
                </tr>
            </thead>
            <tbody>{$rows}</tbody>
        </table>";
    }

    // =========================================================================
    // 20. MEMBER_WORKLOAD_BREAKDOWN
    // =========================================================================
    private function renderMemberWorkloadBreakdown(array $data, string $primaryColor): string
    {
        $members = $data['members'] ?? [];
        if (empty($members)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin datos de trabajo por miembro</p>';
        }

        $rows = '';
        foreach ($members as $m) {
            $name = htmlspecialchars($m['name'] ?? 'Miembro');
            $tasks = (int) ($m['tasks_count'] ?? 0);
            $stories = (int) ($m['user_stories_count'] ?? 0);
            $points = (float) ($m['total_points'] ?? 0);
            $completedPoints = (float) ($m['completed_points'] ?? 0);
            $pct = (float) ($m['completion_percentage'] ?? 0);

            $rows .= "
            <tr style=\"border-bottom:1px solid #f1f5f9;\">
                <td style=\"padding:8px;font-size:11px;font-weight:600;color:#1e293b;\">{$name}</td>
                <td style=\"padding:8px;font-size:11px;text-align:center;\"><span style=\"background:#eff6ff;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-weight:600;\">{$tasks}</span></td>
                <td style=\"padding:8px;font-size:11px;text-align:center;\"><span style=\"background:#faf5ff;color:#7e22ce;padding:2px 6px;border-radius:4px;font-weight:600;\">{$stories}</span></td>
                <td style=\"padding:8px;font-size:11px;text-align:center;font-weight:700;\">{$points} pts</td>
                <td style=\"padding:8px;font-size:11px;\">
                    <div style=\"display:flex;align-items:center;gap:6px;\">
                        <div style=\"flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;\">
                            <div style=\"width:{$pct}%;height:100%;background:{$primaryColor};border-radius:3px;\"></div>
                        </div>
                        <span style=\"font-size:10px;font-weight:600;color:#64748b;min-width:32px;\">{$pct}%</span>
                    </div>
                </td>
            </tr>";
        }

        return "
        <table style=\"width:100%;border-collapse:collapse;\">
            <thead>
                <tr style=\"background:#f8fafc;border-bottom:1.5px solid #e2e8f0;font-size:10px;color:#64748b;text-transform:uppercase;\">
                    <th style=\"padding:8px;text-align:left;\">Miembro</th>
                    <th style=\"padding:8px;text-align:center;\">Tareas</th>
                    <th style=\"padding:8px;text-align:center;\">Historias</th>
                    <th style=\"padding:8px;text-align:center;\">Puntos</th>
                    <th style=\"padding:8px;text-align:left;\">Avance</th>
                </tr>
            </thead>
            <tbody>{$rows}</tbody>
        </table>";
    }

    // =========================================================================
    // 21. SPRINT_BURNDOWN
    // =========================================================================
    private function renderSprintBurndown(ReportBlock $block, array $data, string $primaryColor): string
    {
        $cycle = $data['selected_cycle'] ?? null;
        if (! $cycle) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin ciclo seleccionado para burndown</p>';
        }

        $cycleName = htmlspecialchars($cycle['name'] ?? 'Sprint');
        $status = htmlspecialchars($cycle['status'] ?? 'CURRENT');
        $startDate = $cycle['start_date'] ?? '';
        $endDate = $cycle['end_date'] ?? '';
        $datesText = ($startDate && $endDate) ? "{$startDate} al {$endDate}" : '';
        $metrics = $data['metrics'] ?? [];
        $scope = (int) ($metrics['scope'] ?? 0);
        $completed = (int) ($metrics['completed'] ?? 0);
        $pending = (int) ($metrics['pending'] ?? 0);
        $rate = (float) ($metrics['completion_rate'] ?? 0);

        $filterBy = $data['filter_by'] ?? ($block->config['filter_by'] ?? 'work_items');
        $chartType = strtolower($data['chart_type'] ?? ($block->config['chart_type'] ?? 'burndown'));
        $chartTypeLabel = $chartType === 'burnup' ? 'BURN-UP' : 'BURN-DOWN';
        $filterByLabel = $filterBy === 'estimates' ? 'ESTIMATES' : 'WORK ITEMS';

        $timeline = $data['timeline'] ?? [];
        $dates = $timeline['dates'] ?? [];
        $rawSeries = ($filterBy === 'estimates') ? ($timeline['estimates'] ?? []) : ($timeline['work_items'] ?? []);

        // Fallback si no hay serie cronológica
        if (empty($rawSeries) || empty($dates)) {
            return "
            <div>
                <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;\">
                    <div>
                        <span style=\"font-weight:700;font-size:12px;color:#0f172a;\">{$cycleName}</span>
                        <span style=\"font-size:10px;color:#64748b;margin-left:6px;\">({$datesText})</span>
                    </div>
                    <div>
                        <span style=\"background:#ecfdf5;color:#047857;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:600;border:1px solid #a7f3d0;\">{$status} • {$chartTypeLabel}</span>
                    </div>
                </div>
                <div style=\"display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;margin-bottom:12px;\">
                    <div style=\"background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;\">
                        <div style=\"font-size:9px;color:#64748b;text-transform:uppercase;\">Alcance</div>
                        <div style=\"font-size:14px;font-weight:700;color:#0f172a;\">{$scope}</div>
                    </div>
                    <div style=\"background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;\">
                        <div style=\"font-size:9px;color:#64748b;text-transform:uppercase;\">Completadas</div>
                        <div style=\"font-size:14px;font-weight:700;color:#10b981;\">{$completed}</div>
                    </div>
                    <div style=\"background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;\">
                        <div style=\"font-size:9px;color:#64748b;text-transform:uppercase;\">Pendientes</div>
                        <div style=\"font-size:14px;font-weight:700;color:#f59e0b;\">{$pending}</div>
                    </div>
                    <div style=\"background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;\">
                        <div style=\"font-size:9px;color:#64748b;text-transform:uppercase;\">% Avance</div>
                        <div style=\"font-size:14px;font-weight:700;color:{$primaryColor};\">{$rate}%</div>
                    </div>
                </div>
                <p style=\"font-size:11px;color:#94a3b8;text-align:center;padding:16px 0;\">Sin datos de serie cronológica para el sprint seleccionado</p>
            </div>";
        }

        // SVG parameters matching CycleBurndownChart.tsx
        $viewBoxWidth = 840;
        $viewBoxHeight = 340;
        $padLeft = 65;
        $padRight = 35;
        $padTop = 35;
        $padBottom = 45;
        $chartWidth = $viewBoxWidth - $padLeft - $padRight;
        $chartHeight = $viewBoxHeight - $padTop - $padBottom;

        $totalPoints = count($dates);
        $totalIntervals = max(1, $totalPoints - 1);

        $todayIndex = (int) ($data['today_index'] ?? 0);
        $todayIndex = max(0, min($totalIntervals, $todayIndex));

        // Max Y calculation
        $rawMax = 1.0;
        foreach ($rawSeries as $pt) {
            $rawMax = max(
                $rawMax,
                (float) ($pt['scope'] ?? 0),
                (float) ($pt['pending'] ?? 0),
                (float) ($pt['completed'] ?? 0),
                (float) ($pt['started'] ?? 0),
                (float) ($pt['ideal_pending'] ?? 0),
                (float) ($pt['ideal_completed'] ?? 0)
            );
        }
        if ($rawMax <= 5) {
            $maxVal = 5;
        } elseif ($rawMax <= 10) {
            $maxVal = 10;
        } else {
            $maxVal = (int) (ceil($rawMax / 5) * 5);
        }
        $yTicks = [0, (int) round($maxVal * 0.25), (int) round($maxVal * 0.5), (int) round($maxVal * 0.75), $maxVal];

        $getX = fn (int $idx) => round($padLeft + ($idx / $totalIntervals) * $chartWidth, 2);
        $getY = function (float $val) use ($padTop, $chartHeight, $maxVal) {
            $ratio = max(0.0, min(1.0, $val / $maxVal));

            return round($padTop + $chartHeight - ($ratio * $chartHeight), 2);
        };

        // 1. Scope line
        $scopeVal = (float) ($rawSeries[0]['scope'] ?? 0);
        $hasVaryingScope = false;
        foreach ($rawSeries as $pt) {
            if ((float) ($pt['scope'] ?? 0) !== $scopeVal) {
                $hasVaryingScope = true;
                break;
            }
        }
        if ($hasVaryingScope) {
            $scopeParts = [];
            foreach ($rawSeries as $i => $pt) {
                $cmd = ($i === 0) ? 'M' : 'L';
                $scopeParts[] = "{$cmd} {$getX($i)} {$getY((float) ($pt['scope'] ?? 0))}";
            }
            $scopePath = implode(' ', $scopeParts);
        } else {
            $scopePath = "M {$getX(0)} {$getY($scopeVal)} L {$getX($totalIntervals)} {$getY($scopeVal)}";
        }

        // 2. Ideal line
        $idealParts = [];
        foreach ($rawSeries as $i => $pt) {
            $val = ($chartType === 'burndown') ? (float) ($pt['ideal_pending'] ?? 0) : (float) ($pt['ideal_completed'] ?? 0);
            $cmd = ($i === 0) ? 'M' : 'L';
            $idealParts[] = "{$cmd} {$getX($i)} {$getY($val)}";
        }
        $idealPath = implode(' ', $idealParts);

        // 3. Primary & Started lines up to todayIndex
        $activePoints = array_slice($rawSeries, 0, $todayIndex + 1);
        $primaryParts = [];
        $startedParts = [];
        $dots = '';
        foreach ($activePoints as $i => $pt) {
            $val = ($chartType === 'burndown') ? (float) ($pt['pending'] ?? 0) : (float) ($pt['completed'] ?? 0);
            $stVal = (float) ($pt['started'] ?? 0);
            $cmd = ($i === 0) ? 'M' : 'L';
            $primaryParts[] = "{$cmd} {$getX($i)} {$getY($val)}";
            $startedParts[] = "{$cmd} {$getX($i)} {$getY($stVal)}";
            $dots .= "<circle cx=\"{$getX($i)}\" cy=\"{$getY($val)}\" r=\"3.5\" fill=\"#10b981\" stroke=\"#ffffff\" stroke-width=\"1.5\" />";
        }
        $primaryPath = implode(' ', $primaryParts);
        $startedPath = implode(' ', $startedParts);

        // 4. Light green area under primary curve
        $primaryAreaPath = '';
        if (! empty($activePoints)) {
            $startX = $getX(0);
            $endX = $getX($todayIndex);
            $bottomY = $getY(0);
            $linePoints = '';
            foreach ($activePoints as $i => $pt) {
                $val = ($chartType === 'burndown') ? (float) ($pt['pending'] ?? 0) : (float) ($pt['completed'] ?? 0);
                $linePoints .= " L {$getX($i)} {$getY($val)}";
            }
            $primaryAreaPath = "M {$startX} {$bottomY}{$linePoints} L {$endX} {$bottomY} Z";
        }

        // 5. Red lag area between pending and ideal in burndown
        $redLagAreaPath = '';
        if ($chartType === 'burndown' && ! empty($activePoints)) {
            $lagStartIndex = -1;
            foreach ($activePoints as $i => $pt) {
                if ((float) ($pt['pending'] ?? 0) > (float) ($pt['ideal_pending'] ?? 0)) {
                    $lagStartIndex = $i;
                    break;
                }
            }
            if ($lagStartIndex !== -1 && $lagStartIndex <= $todayIndex) {
                $startX = $getX($lagStartIndex);
                $startIdeal = (float) ($rawSeries[$lagStartIndex]['ideal_pending'] ?? 0);
                $path = "M {$startX} {$getY($startIdeal)}";
                for ($i = $lagStartIndex; $i <= $todayIndex; $i++) {
                    $pt = $rawSeries[$i] ?? [];
                    $path .= " L {$getX($i)} {$getY((float) ($pt['pending'] ?? 0))}";
                }
                for ($i = $todayIndex; $i >= $lagStartIndex; $i--) {
                    $pt = $rawSeries[$i] ?? [];
                    $path .= " L {$getX($i)} {$getY((float) ($pt['ideal_pending'] ?? 0))}";
                }
                $path .= ' Z';
                $redLagAreaPath = $path;
            }
        }

        // 6. Future zone rectangle from todayIndex to end
        $futureZoneX = $getX($todayIndex);
        $futureZoneWidth = max(0, $getX($totalIntervals) - $futureZoneX);
        $futureZoneY = $padTop;
        $futureZoneHeight = $chartHeight;

        // Unique IDs for SVG gradients
        $uid = 'sb_'.substr(md5((string) ($block->id ?? mt_rand())), 0, 8);

        // Y Grid & Axis Labels
        $yAxisHtml = '';
        foreach ($yTicks as $tickVal) {
            $y = $getY((float) $tickVal);
            $yAxisHtml .= "
            <line x1=\"{$padLeft}\" y1=\"{$y}\" x2=\"".($viewBoxWidth - $padRight)."\" y2=\"{$y}\" stroke=\"#e2e8f0\" stroke-dasharray=\"3 3\" stroke-width=\"1\" />
            <text x=\"".($padLeft - 10).'" y="'.($y + 4)."\" text-anchor=\"end\" font-size=\"10px\" font-weight=\"500\" fill=\"#94a3b8\">{$tickVal}</text>";
        }

        // X Axis Labels
        $xAxisHtml = '';
        $skip = count($dates) > 14 ? 2 : 1;
        foreach ($dates as $i => $dStr) {
            if ($i % $skip !== 0 && $i !== $todayIndex && $i !== $totalIntervals) {
                continue;
            }
            $x = $getX($i);
            $isToday = ($i === $todayIndex);
            $color = $isToday ? '#0f172a' : '#94a3b8';
            $weight = $isToday ? 'bold' : 'normal';
            $label = htmlspecialchars(strtolower($dStr));
            $xAxisHtml .= "<text x=\"{$x}\" y=\"".($padTop + $chartHeight + 18)."\" text-anchor=\"middle\" font-size=\"9px\" font-weight=\"{$weight}\" fill=\"{$color}\">{$label}</text>";
        }

        // Vertical today marker
        $todayX = $getX($todayIndex);
        $todayLabel = htmlspecialchars(strtolower($dates[$todayIndex] ?? 'hoy'));
        $todayMarkerHtml = "
        <g>
            <line x1=\"{$todayX}\" y1=\"".($padTop - 8)."\" x2=\"{$todayX}\" y2=\"".($padTop + $chartHeight)."\" stroke=\"#0f172a\" stroke-width=\"1.5\" stroke-dasharray=\"3 3\" />
            <g transform=\"translate({$todayX}, ".($padTop - 12).")\">
                <rect x=\"-24\" y=\"-14\" width=\"48\" height=\"16\" rx=\"4\" fill=\"#0f172a\" />
                <text x=\"0\" y=\"-3\" text-anchor=\"middle\" font-size=\"9px\" font-weight=\"bold\" fill=\"#ffffff\">{$todayLabel}</text>
            </g>
        </g>";

        $primaryLegendLabel = $chartType === 'burndown' ? 'Pendientes' : 'Completadas';

        return "
        <div>
            <!-- Header con información de ciclo -->
            <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;\">
                <div>
                    <span style=\"font-weight:700;font-size:12px;color:#0f172a;\">{$cycleName}</span>
                    <span style=\"font-size:10px;color:#64748b;margin-left:6px;\">({$datesText})</span>
                </div>
                <div>
                    <span style=\"background:#ecfdf5;color:#047857;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:600;border:1px solid #a7f3d0;\">{$status} • {$chartTypeLabel}</span>
                </div>
            </div>

            <!-- KPIs Summary -->
            <div style=\"display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;margin-bottom:12px;\">
                <div style=\"background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;\">
                    <div style=\"font-size:9px;color:#64748b;text-transform:uppercase;\">Alcance</div>
                    <div style=\"font-size:14px;font-weight:700;color:#0f172a;\">{$scope}</div>
                </div>
                <div style=\"background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;\">
                    <div style=\"font-size:9px;color:#64748b;text-transform:uppercase;\">Completadas</div>
                    <div style=\"font-size:14px;font-weight:700;color:#10b981;\">{$completed}</div>
                </div>
                <div style=\"background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;\">
                    <div style=\"font-size:9px;color:#64748b;text-transform:uppercase;\">Pendientes</div>
                    <div style=\"font-size:14px;font-weight:700;color:#f59e0b;\">{$pending}</div>
                </div>
                <div style=\"background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;\">
                    <div style=\"font-size:9px;color:#64748b;text-transform:uppercase;\">% Avance</div>
                    <div style=\"font-size:14px;font-weight:700;color:{$primaryColor};\">{$rate}%</div>
                </div>
            </div>

            <!-- Leyenda de líneas idéntica al detalle de ciclo -->
            <div style=\"display:flex;justify-content:flex-end;align-items:center;gap:14px;margin-bottom:8px;font-size:10px;font-weight:500;color:#64748b;\">
                <div style=\"display:flex;align-items:center;gap:5px;\">
                    <span style=\"display:inline-block;width:12px;height:2px;background:#0f172a;border-radius:2px;\"></span>
                    <span>Alcance</span>
                </div>
                <div style=\"display:flex;align-items:center;gap:5px;\">
                    <span style=\"display:inline-block;width:12px;height:2px;background:#10b981;border-radius:2px;\"></span>
                    <span>{$primaryLegendLabel}</span>
                </div>
                <div style=\"display:flex;align-items:center;gap:5px;\">
                    <span style=\"display:inline-block;width:12px;height:2px;background:#f97316;border-radius:2px;\"></span>
                    <span>Iniciadas</span>
                </div>
                <div style=\"display:flex;align-items:center;gap:5px;\">
                    <span style=\"display:inline-block;width:14px;height:0;border-top:2px dashed #3b82f6;\"></span>
                    <span>Ideal</span>
                </div>
            </div>

            <!-- Gráfico SVG idéntico al detalle del ciclo -->
            <div style=\"width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:8px;\">
                <svg viewBox=\"0 0 {$viewBoxWidth} {$viewBoxHeight}\" style=\"width:100%;height:auto;display:block;\">
                    <defs>
                        <linearGradient id=\"greenAreaGrad_{$uid}\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
                            <stop offset=\"0%\" stop-color=\"#10b981\" stop-opacity=\"0.22\" />
                            <stop offset=\"100%\" stop-color=\"#10b981\" stop-opacity=\"0.02\" />
                        </linearGradient>
                        <linearGradient id=\"redLagGrad_{$uid}\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
                            <stop offset=\"0%\" stop-color=\"#ef4444\" stop-opacity=\"0.25\" />
                            <stop offset=\"100%\" stop-color=\"#ef4444\" stop-opacity=\"0.08\" />
                        </linearGradient>
                        <linearGradient id=\"futureZoneGrad_{$uid}\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">
                            <stop offset=\"0%\" stop-color=\"#3b82f6\" stop-opacity=\"0.08\" />
                            <stop offset=\"100%\" stop-color=\"#3b82f6\" stop-opacity=\"0.02\" />
                        </linearGradient>
                    </defs>

                    <!-- Zona Futura -->
                    <rect x=\"{$futureZoneX}\" y=\"{$futureZoneY}\" width=\"{$futureZoneWidth}\" height=\"{$futureZoneHeight}\" fill=\"url(#futureZoneGrad_{$uid})\" />

                    <!-- Área sombreada verde -->
                    <path d=\"{$primaryAreaPath}\" fill=\"url(#greenAreaGrad_{$uid})\" />

                    <!-- Área de retraso roja (si aplica) -->
                    ".($redLagAreaPath ? "<path d=\"{$redLagAreaPath}\" fill=\"url(#redLagGrad_{$uid})\" />" : '')."

                    <!-- Cuadrícula horizontal e indicadores numéricos del eje Y -->
                    {$yAxisHtml}

                    <!-- Título eje Y -->
                    <text x=\"{$padLeft}\" y=\"".($padTop - 14)."\" text-anchor=\"start\" font-size=\"9px\" font-weight=\"bold\" fill=\"#64748b\" letter-spacing=\"0.05em\">{$filterByLabel}</text>

                    <!-- Eje X: Etiquetas de fechas -->
                    {$xAxisHtml}

                    <!-- Marcador vertical de hoy -->
                    {$todayMarkerHtml}

                    <!-- Línea Ideal punteada azul -->
                    <path d=\"{$idealPath}\" stroke=\"#3b82f6\" stroke-width=\"2\" stroke-dasharray=\"4 4\" fill=\"none\" />

                    <!-- Línea de Alcance (Scope) -->
                    <path d=\"{$scopePath}\" stroke=\"#0f172a\" stroke-width=\"2\" fill=\"none\" />

                    <!-- Línea de Iniciadas (Started) -->
                    <path d=\"{$startedPath}\" stroke=\"#f97316\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />

                    <!-- Línea Principal (Pending/Completed) -->
                    <path d=\"{$primaryPath}\" stroke=\"#10b981\" stroke-width=\"2.5\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />

                    <!-- Puntos sobre línea principal -->
                    {$dots}
                </svg>
            </div>
        </div>";
    }

    // =========================================================================
    // 22. USER_STORIES_EVIDENCES
    // =========================================================================
    private function renderUserStoriesEvidences(array $data): string
    {
        $stories = $data['stories'] ?? [];
        if (empty($stories)) {
            return '<p style="font-size:11px;color:#94a3b8;">Sin historias de usuario para mostrar</p>';
        }

        $html = '<div style="display:flex;flex-direction:column;gap:12px;">';

        foreach ($stories as $story) {
            $id = htmlspecialchars($story['identifier'] ?? 'STORY');
            $title = htmlspecialchars($story['title'] ?? '');
            $state = htmlspecialchars($story['state']['name'] ?? 'Sin estado');
            $stateColor = htmlspecialchars($story['state']['color'] ?? '#94a3b8');
            $points = (float) ($story['estimate_points'] ?? 0);

            $html .= "
            <div class=\"story-card\" style=\"border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#ffffff;page-break-inside:auto;break-inside:auto;margin-bottom:12px;\">
                <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;\">
                    <div style=\"display:flex;align-items:center;gap:6px;\">
                        <span style=\"font-weight:700;font-size:11px;color:#4f46e5;\">{$id}</span>
                        <span style=\"font-weight:600;font-size:11px;color:#1e293b;\">{$title}</span>
                    </div>
                    <div style=\"display:flex;align-items:center;gap:6px;\">
                        <span style=\"font-size:9px;padding:2px 6px;border-radius:10px;background:{$stateColor}20;color:{$stateColor};font-weight:600;\">{$state}</span>
                        <span style=\"font-size:10px;font-weight:600;color:#64748b;\">{$points} pts</span>
                    </div>
                </div>";

            // Render de evidencias de la historia raíz
            $evidences = $story['evidences'] ?? [];
            $images = $evidences['images'] ?? [];
            $pdfs = $evidences['pdfs'] ?? [];

            if (! empty($images)) {
                $html .= '<div style="margin-top:10px;margin-bottom:12px;width:100%;">';
                $html .= '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">📸 Evidencias Fotográficas ('.count($images).')</div>';
                $html .= '<div style="display:flex;flex-direction:column;gap:14px;width:100%;">';
                foreach ($images as $img) {
                    $imgUrl = ! empty($img['data_url']) ? $img['data_url'] : htmlspecialchars($img['url'] ?? '');
                    $imgTitle = htmlspecialchars($img['title'] ?? $img['file_name'] ?? 'Evidencia');
                    $creator = htmlspecialchars($img['creator']['name'] ?? 'Usuario');
                    $html .= "
                    <div class=\"evidence-image-card\" style=\"width:100%;border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#f8fafc;page-break-inside:avoid;break-inside:avoid;box-sizing:border-box;\">
                        <div style=\"width:100%;max-height:480px;background:#0f172a;display:flex;align-items:center;justify-content:center;overflow:hidden;\">
                            <img src=\"{$imgUrl}\" alt=\"{$imgTitle}\" style=\"width:100%;max-height:480px;object-fit:contain;display:block;\" />
                        </div>
                        <div style=\"padding:8px 12px;background:#ffffff;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;\">
                            <span style=\"font-size:11px;font-weight:700;color:#1e293b;\">{$imgTitle}</span>
                            <span style=\"font-size:10px;color:#94a3b8;\">{$creator}</span>
                        </div>
                    </div>";
                }
                $html .= '</div></div>';
            }

            if (! empty($pdfs)) {
                $html .= '<div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">';
                foreach ($pdfs as $pdf) {
                    $pdfName = htmlspecialchars($pdf['file_name'] ?? 'Evidencia PDF');
                    $pdfUrl = htmlspecialchars($pdf['url'] ?? '#');
                    $html .= "<a href=\"{$pdfUrl}\" target=\"_blank\" style=\"font-size:10px;color:#ef4444;text-decoration:none;font-weight:600;display:inline-block;\">📄 {$pdfName} (Descargar PDF)</a>";
                }
                $html .= '</div>';
            }

            // Sub-historias (formato anidado)
            $subStories = $story['sub_stories'] ?? [];
            if (! empty($subStories)) {
                $html .= '<div style="margin-left:16px;border-left:2px dashed #cbd5e1;padding-left:10px;margin-top:8px;display:flex;flex-direction:column;gap:6px;">';
                foreach ($subStories as $sub) {
                    $subId = htmlspecialchars($sub['identifier'] ?? 'SUB');
                    $subTitle = htmlspecialchars($sub['title'] ?? '');
                    $subState = htmlspecialchars($sub['state']['name'] ?? '');
                    $subColor = htmlspecialchars($sub['state']['color'] ?? '#94a3b8');

                    $html .= "
                    <div style=\"background:#f8fafc;padding:6px 8px;border-radius:6px;border:1px solid #e2e8f0;\">
                        <div style=\"display:flex;justify-content:space-between;align-items:center;\">
                            <span style=\"font-size:10px;font-weight:600;color:#334155;\">↳ {$subId}: {$subTitle}</span>
                            <span style=\"font-size:9px;color:{$subColor};font-weight:600;\">{$subState}</span>
                        </div>";

                    $subImages = $sub['evidences']['images'] ?? [];
                    $subPdfs = $sub['evidences']['pdfs'] ?? [];

                    if (! empty($subImages)) {
                        $html .= '<div style="margin-top:8px;margin-bottom:8px;width:100%;">';
                        $html .= '<div style="display:flex;flex-direction:column;gap:10px;width:100%;">';
                        foreach ($subImages as $sImg) {
                            $sUrl = ! empty($sImg['data_url']) ? $sImg['data_url'] : htmlspecialchars($sImg['url'] ?? '');
                            $sTitle = htmlspecialchars($sImg['title'] ?? $sImg['file_name'] ?? 'Sub-evidencia');
                            $html .= "
                            <div class=\"evidence-image-card\" style=\"width:100%;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;background:#ffffff;page-break-inside:avoid;break-inside:avoid;box-sizing:border-box;\">
                                <div style=\"width:100%;max-height:380px;background:#0f172a;display:flex;align-items:center;justify-content:center;overflow:hidden;\">
                                    <img src=\"{$sUrl}\" alt=\"{$sTitle}\" style=\"width:100%;max-height:380px;object-fit:contain;display:block;\" />
                                </div>
                                <div style=\"padding:6px 10px;font-size:10px;font-weight:600;color:#334155;\">
                                    {$sTitle}
                                </div>
                            </div>";
                        }
                        $html .= '</div></div>';
                    }

                    if (! empty($subPdfs)) {
                        foreach ($subPdfs as $sPdf) {
                            $sName = htmlspecialchars($sPdf['file_name'] ?? 'PDF');
                            $sUrl = htmlspecialchars($sPdf['url'] ?? '#');
                            $html .= "<div style=\"margin-top:3px;\"><a href=\"{$sUrl}\" target=\"_blank\" style=\"font-size:9px;color:#ef4444;text-decoration:none;font-weight:600;\">📄 {$sName}</a></div>";
                        }
                    }

                    $html .= '</div>';
                }
                $html .= '</div>';
            }

            $html .= '</div>';
        }

        $html .= '</div>';

        return $html;
    }

    // =========================================================================
    // Helpers
    // =========================================================================
    private function priorityLabel(string $priority): string
    {
        return match ($priority) {
            'URGENT' => 'Urgente',
            'HIGH' => 'Alta',
            'MEDIUM' => 'Media',
            'LOW' => 'Baja',
            'NONE' => 'Sin Prioridad',
            default => $priority,
        };
    }

    private function priorityClass(string $priority): string
    {
        return match ($priority) {
            'URGENT' => 'priority-urgent',
            'HIGH' => 'priority-high',
            'MEDIUM' => 'priority-medium',
            'LOW' => 'priority-low',
            default => 'priority-none',
        };
    }
}
