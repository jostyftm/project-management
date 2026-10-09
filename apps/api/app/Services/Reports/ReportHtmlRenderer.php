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
    public function render(WorkspaceReport $report, array $resolvedData = []): string
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
            margin: 12mm 14mm 14mm 14mm;
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
            display: flex;
            flex-wrap: wrap;
            margin: -8px;
        }
        .col-12 { width: 100%; padding: 8px; }
        .col-8  { width: 66.6666%; padding: 8px; }
        .col-6  { width: 50%; padding: 8px; }
        .col-4  { width: 33.3333%; padding: 8px; }

        .card {
            background: {$surfaceColor};
            border: 1px solid #e2e8f0;
            border-radius: {$borderRadius};
            padding: 16px 18px;
            page-break-inside: avoid;
            break-inside: avoid;
            height: calc(100% - 32px);
        }
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
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

        <footer class="footer">
            <span>Generado con Plane Reports &bull; Reporte Ejecutivo</span>
            <span>Página 1</span>
        </footer>
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

        $title = htmlspecialchars($block->title ?? $block->type->label());
        $body = $this->renderBlockBody($block, $data, $primaryColor);

        return <<<HTML
        <div class="{$widthClass}">
            <div class="card">
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
    // 9. AREA_CHART (Burn-Up / Creadas vs Completadas)
    // =========================================================================
    private function renderAreaChart(ReportBlock $block, array $data, string $primaryColor): string
    {
        $series = $data['series'] ?? [];
        if (empty($series)) {
            return '<div style="height:120px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">Sin datos de velocidad / burn-up</div>';
        }

        // Muestrear últimos 14 puntos
        $points = array_slice($series, -14);
        $createdVals = array_map(fn ($p) => (int) ($p['created'] ?? 0), $points);
        $completedVals = array_map(fn ($p) => (int) ($p['completed'] ?? 0), $points);
        $maxVal = max(max($createdVals ?: [1]), max($completedVals ?: [1])) ?: 1;

        $w = 540;
        $h = 135;
        $padLeft = 28;
        $padRight = 14;
        $padTop = 14;
        $padBottom = 24;
        $plotW = $w - $padLeft - $padRight;
        $plotH = $h - $padTop - $padBottom;
        $bottomY = $padTop + $plotH;

        $step = count($points) > 1 ? $plotW / (count($points) - 1) : $plotW;

        $cPoints = [];
        $compPoints = [];
        foreach ($points as $i => $pt) {
            $x = round($padLeft + ($i * $step), 1);
            $yC = round($padTop + $plotH - (($pt['created'] / $maxVal) * $plotH), 1);
            $yComp = round($padTop + $plotH - (($pt['completed'] / $maxVal) * $plotH), 1);
            $cPoints[] = "{$x},{$yC}";
            $compPoints[] = "{$x},{$yComp}";
        }

        $cPolyStr = implode(' ', $cPoints);
        $compPolyStr = implode(' ', $compPoints);
        $firstX = round($padLeft, 1);
        $lastX = round($padLeft + ((count($points) - 1) * $step), 1);

        $cAreaStr = "{$firstX},{$bottomY} {$cPolyStr} {$lastX},{$bottomY}";
        $compAreaStr = "{$firstX},{$bottomY} {$compPolyStr} {$lastX},{$bottomY}";

        $totalCreated = array_sum(array_column($series, 'created'));
        $totalCompleted = array_sum(array_column($series, 'completed'));

        return "
        <div>
            <div style=\"display:flex;gap:14px;justify-content:flex-end;font-size:10px;margin-bottom:6px;\">
                <span style=\"display:flex;align-items:center;gap:4px;\">
                    <span style=\"width:8px;height:8px;border-radius:2px;background:#3b82f6;display:inline-block;\"></span>
                    Creadas: <strong>{$totalCreated}</strong>
                </span>
                <span style=\"display:flex;align-items:center;gap:4px;\">
                    <span style=\"width:8px;height:8px;border-radius:2px;background:#10b981;display:inline-block;\"></span>
                    Completadas: <strong>{$totalCompleted}</strong>
                </span>
            </div>
            <div style=\"width:100%;height:140px;\">
                <svg width=\"100%\" height=\"{$h}\" viewBox=\"0 0 {$w} {$h}\" style=\"overflow:visible;\">
                    <line x1=\"{$padLeft}\" y1=\"{$bottomY}\" x2=\"{$w}\" y2=\"{$bottomY}\" stroke=\"#cbd5e1\" stroke-width=\"1\" />
                    <polygon fill=\"#3b82f6\" fill-opacity=\"0.18\" points=\"{$cAreaStr}\" />
                    <polyline fill=\"none\" stroke=\"#3b82f6\" stroke-width=\"2\" points=\"{$cPolyStr}\" stroke-linejoin=\"round\" />
                    <polygon fill=\"#10b981\" fill-opacity=\"0.28\" points=\"{$compAreaStr}\" />
                    <polyline fill=\"none\" stroke=\"#10b981\" stroke-width=\"2\" points=\"{$compPolyStr}\" stroke-linejoin=\"round\" />
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

        $totalEvents = $data['total_events'] ?? 0;
        $levelColors = [
            0 => '#ebedf0',
            1 => '#9be9a8',
            2 => '#40c463',
            3 => '#30a14e',
            4 => '#216e39',
        ];

        // Agrupar matriz en semanas (columnas de 7 días)
        $weeks = array_chunk($matrix, 7);

        $html = "
        <div>
            <div style=\"display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#64748b;margin-bottom:8px;\">
                <span>Total de eventos: <strong>{$totalEvents}</strong></span>
                <span style=\"display:flex;align-items:center;gap:4px;\">
                    Menos
                    <span style=\"width:9px;height:9px;background:{$levelColors[0]};border-radius:2px;display:inline-block;\"></span>
                    <span style=\"width:9px;height:9px;background:{$levelColors[1]};border-radius:2px;display:inline-block;\"></span>
                    <span style=\"width:9px;height:9px;background:{$levelColors[2]};border-radius:2px;display:inline-block;\"></span>
                    <span style=\"width:9px;height:9px;background:{$levelColors[3]};border-radius:2px;display:inline-block;\"></span>
                    <span style=\"width:9px;height:9px;background:{$levelColors[4]};border-radius:2px;display:inline-block;\"></span>
                    Más
                </span>
            </div>
            <div style=\"display:flex;gap:3px;overflow-x:auto;padding:6px 0;\">";

        foreach ($weeks as $w) {
            $html .= '<div style="display:flex;flex-direction:column;gap:3px;">';
            foreach ($w as $day) {
                $lvl = $day['level'] ?? 0;
                $col = $levelColors[$lvl] ?? $levelColors[0];
                $cnt = $day['count'] ?? 0;
                $dt = $day['date'] ?? '';
                $html .= "<div style=\"width:10px;height:10px;border-radius:2px;background:{$col};\" title=\"{$dt}: {$cnt} eventos\"></div>";
            }
            $html .= '</div>';
        }

        $html .= '</div></div>';

        return $html;
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
        $url = htmlspecialchars($data['url'] ?? ($block->config['url'] ?? ''));
        if (empty($url)) {
            return '<div style="height:100px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">Imagen sin configurar</div>';
        }

        $alt = htmlspecialchars($data['alt'] ?? ($block->config['alt'] ?? 'Imagen del reporte'));
        $caption = htmlspecialchars($data['caption'] ?? ($block->config['caption'] ?? ''));
        $align = $data['alignment'] ?? ($block->config['alignment'] ?? 'center');

        $captionHtml = $caption ? "<figcaption style=\"font-size:10px;color:#64748b;margin-top:4px;\">{$caption}</figcaption>" : '';

        return "
        <figure style=\"margin:0;text-align:{$align};\">
            <img src=\"{$url}\" alt=\"{$alt}\" style=\"max-width:100%;border-radius:6px;max-height:260px;object-fit:contain;\" />
            {$captionHtml}
        </figure>";
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
