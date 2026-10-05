<?php

use App\Enums\BlockType;
use App\Enums\ReportVisibility;
use App\Models\ReportBlock;
use App\Models\ReportSnapshot;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceReport;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    \Illuminate\Support\Facades\Cache::flush();
    $this->user = User::factory()->create();
    $this->workspace = Workspace::create([
        'name'     => 'Test Workspace',
        'slug'     => 'test-workspace-' . uniqid(),
        'owner_id' => $this->user->id,
    ]);
    $this->workspace->members()->attach($this->user->id, ['role' => 'ADMIN', 'joined_at' => now()]);

    $this->actingAs($this->user);
});

// === CRUD REPORTES ===

it('puede crear un reporte en el workspace', function () {
    $response = $this->postJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports", [
        'title'      => 'Mi Reporte de Prueba',
        'visibility' => 'draft',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.title', 'Mi Reporte de Prueba')
        ->assertJsonPath('data.attributes.visibility', 'draft');

    $this->assertDatabaseHas('workspace_reports', [
        'title'        => 'Mi Reporte de Prueba',
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);
});

it('puede listar los reportes del workspace', function () {
    WorkspaceReport::factory(3)->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
        'visibility'   => ReportVisibility::WORKSPACE->value,
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('puede actualizar un reporte propio', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $response = $this->patchJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}", [
        'title' => 'Título Actualizado',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.title', 'Título Actualizado');
});

it('no puede actualizar un reporte ajeno', function () {
    $otherUser = User::factory()->create();
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $otherUser->id,
        'visibility'   => ReportVisibility::WORKSPACE->value,
    ]);

    $response = $this->patchJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}", [
        'title' => 'Intento de Hack',
    ]);

    $response->assertStatus(403);
});

it('puede eliminar un reporte propio', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $response = $this->deleteJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('workspace_reports', ['id' => $report->id]);
});

// === BLOQUES ===

it('puede crear un bloque kpi_row en un reporte', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $response = $this->postJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks", [
        'type'   => 'kpi_row',
        'title'  => 'KPIs Principales',
        'config' => ['metrics' => ['total', 'completed']],
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.type', 'kpi_row');
});

it('puede reordenar los bloques de un reporte', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block1 = ReportBlock::factory()->create(['report_id' => $report->id, 'position' => 0]);
    $block2 = ReportBlock::factory()->create(['report_id' => $report->id, 'position' => 1]);

    $response = $this->postJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/reorder", [
        'order' => [
            ['id' => $block1->id, 'position' => 1],
            ['id' => $block2->id, 'position' => 0],
        ],
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('report_blocks', ['id' => $block1->id, 'position' => 1]);
    $this->assertDatabaseHas('report_blocks', ['id' => $block2->id, 'position' => 0]);
});

// === RESOLVER ===

it('el resolver kpi_row retorna estructura correcta', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::KPI_ROW->value,
        'config'    => ['metrics' => ['total', 'completed', 'in_progress', 'overdue']],
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['kpis', 'sparkline', 'period']]);
});

it('el resolver bar_chart retorna estructura con data y dimension', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::BAR_CHART->value,
        'config'    => ['dimension' => 'state'],
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['dimension', 'metric', 'data', 'total']]);
});

it('el resolver donut_chart retorna segmentos con porcentajes', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::DONUT_CHART->value,
        'config'    => ['dimension' => 'priority'],
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['dimension', 'segments', 'total']]);
});

it('el resolver area_chart retorna serie temporal con created y completed', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::AREA_CHART->value,
        'config'    => ['grouping' => 'week'],
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['series', 'grouping', 'period']]);
});

it('el resolver project_summary retorna metricas de salud y avance', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::PROJECT_SUMMARY->value,
        'config'    => [],
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonPath('data.has_project', false); // No hay proyectos en el workspace fresco
});

it('el resolver table retorna filas estructuradas', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::TABLE->value,
        'config'    => ['limit' => 5],
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['rows', 'total', 'columns']]);
});

it('el resolver work_items_list retorna items con filtro', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::WORK_ITEMS_LIST->value,
        'config'    => ['filter' => 'urgent', 'limit' => 5],
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['filter', 'items', 'count']]);
});

it('el resolver cycles_overview retorna ciclos estructurados', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::CYCLES_OVERVIEW->value,
        'config'    => ['status' => 'all'],
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['cycles', 'total', 'status']]);
});

it('el resolver releases_timeline retorna releases estructurados', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::RELEASES_TIMELINE->value,
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['releases', 'total', 'status']]);
});

it('el resolver milestones_progress retorna hitos y porcentajes', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::MILESTONES_PROGRESS->value,
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['milestones', 'total', 'status']]);
});

it('el resolver team_workload retorna miembros y conteo de carga', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::TEAM_WORKLOAD->value,
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['members', 'total_members', 'total_assigned', 'total_active']]);
});

it('el resolver recent_activity retorna feed de eventos', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::RECENT_ACTIVITY->value,
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['activities', 'total']]);
});

it('el resolver risks_blockers retorna riesgos agrupados', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::RISKS_BLOCKERS->value,
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['risks', 'summary' => ['overdue_count', 'stagnant_count', 'urgent_count']]]);
});

it('el resolver heatmap retorna matriz de calor y periodos', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $block = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::HEATMAP->value,
        'config'    => ['weeks' => 8],
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$block->id}/data");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['matrix', 'total_events', 'weeks', 'period']]);
});

it('los resolvers de formato estetico retornan sus configuraciones', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $calloutBlock = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::CALLOUT->value,
        'config'    => ['variant' => 'warning', 'title' => 'Atención'],
    ]);

    $dividerBlock = ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::DIVIDER->value,
        'config'    => ['style' => 'dashed'],
    ]);

    $respCallout = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$calloutBlock->id}/data");
    $respCallout->assertStatus(200)->assertJsonPath('data.variant', 'warning');

    $respDivider = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/blocks/{$dividerBlock->id}/data");
    $respDivider->assertStatus(200)->assertJsonPath('data.style', 'dashed');
});

// === PLANTILLAS ===

it('puede listar las plantillas disponibles', function () {
    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/templates");

    $response->assertStatus(200)
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('data.0.id', 'weekly_exec');
});

it('puede crear un reporte a partir de una plantilla', function () {
    $response = $this->postJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports", [
        'title'    => 'Reporte Ejecutivo Nuevo',
        'template' => 'weekly_exec',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.title', 'Reporte Ejecutivo Nuevo');

    $reportId = $response->json('data.id');
    $this->assertDatabaseHas('workspace_reports', ['id' => $reportId]);
    $this->assertDatabaseHas('report_blocks', ['report_id' => $reportId, 'type' => 'project_summary']);
    $this->assertDatabaseHas('report_blocks', ['report_id' => $reportId, 'type' => 'kpi_row']);
});

it('puede aplicar una plantilla a un reporte existente', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $response = $this->postJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/apply-template", [
        'template' => 'sprint_review',
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('report_blocks', ['report_id' => $report->id, 'type' => 'cycles_overview']);
    $this->assertDatabaseHas('report_blocks', ['report_id' => $report->id, 'type' => 'team_workload']);
});

// === SNAPSHOTS / VERSIONADO ===

it('puede crear un snapshot congelando bloques y datos', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::KPI_ROW->value,
    ]);

    $response = $this->postJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/snapshots", [
        'title' => 'Snapshot v1.0',
        'note'  => 'Versión congelada al cierre del sprint',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.title', 'Snapshot v1.0')
        ->assertJsonPath('data.attributes.note', 'Versión congelada al cierre del sprint');

    $this->assertDatabaseHas('report_snapshots', [
        'report_id' => $report->id,
        'title'     => 'Snapshot v1.0',
    ]);
});

it('puede listar los snapshots de un reporte', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    ReportSnapshot::factory(2)->create([
        'report_id'  => $report->id,
        'created_by' => $this->user->id,
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/snapshots");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('puede ver el detalle de un snapshot', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $snapshot = ReportSnapshot::factory()->create([
        'report_id'  => $report->id,
        'created_by' => $this->user->id,
        'title'      => 'Snapshot Detallado',
    ]);

    $response = $this->getJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/snapshots/{$snapshot->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.title', 'Snapshot Detallado');
});

it('puede restaurar un reporte a un snapshot previo', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $snapshot = ReportSnapshot::factory()->create([
        'report_id'       => $report->id,
        'created_by'      => $this->user->id,
        'blocks_snapshot' => [
            [
                'id'       => '99',
                'type'     => 'callout',
                'title'    => 'Bloque Restaurado',
                'position' => 0,
                'width'    => 12,
                'config'   => ['variant' => 'info'],
                'data'     => [],
            ],
        ],
    ]);

    $response = $this->postJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/snapshots/{$snapshot->id}/restore");

    $response->assertStatus(200);
    $this->assertDatabaseHas('report_blocks', [
        'report_id' => $report->id,
        'title'     => 'Bloque Restaurado',
        'type'      => 'callout',
    ]);
});

it('puede eliminar un snapshot', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
    ]);

    $snapshot = ReportSnapshot::factory()->create([
        'report_id'  => $report->id,
        'created_by' => $this->user->id,
    ]);

    $response = $this->deleteJson("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/snapshots/{$snapshot->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('report_snapshots', ['id' => $snapshot->id]);
});

// === TOKEN PÚBLICO ===

it('la ruta pública con token válido es accesible sin auth', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
        'public_token' => 'test-token-abc123',
        'published_at' => now(),
        'visibility'   => ReportVisibility::PUBLIC->value,
    ]);

    $response = $this->withoutMiddleware()->getJson('/api/v1/public/workspace-reports/test-token-abc123');

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.title', $report->title);
});

it('la ruta pública con token inválido retorna 404', function () {
    $response = $this->withoutMiddleware()->getJson('/api/v1/public/workspace-reports/token-invalido');
    $response->assertStatus(404);
});

// === EXPORTACIÓN SERVIDOR (PDF Y PNG) ===

it('puede exportar un reporte a PDF', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
        'title'        => 'Reporte Ejecutivo PDF',
    ]);

    ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::CALLOUT->value,
        'config'    => ['text' => 'Texto para exportar a PDF'],
    ]);

    $response = $this->get("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/export/pdf");

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');
    expect(str_starts_with($response->getContent(), '%PDF'))->toBeTrue();
});

it('puede exportar un reporte a imagen PNG', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
        'title'        => 'Reporte Ejecutivo PNG',
    ]);

    ReportBlock::factory()->create([
        'report_id' => $report->id,
        'type'      => BlockType::CALLOUT->value,
        'config'    => ['text' => 'Texto para exportar a PNG'],
    ]);

    $response = $this->get("/api/v1/workspaces/{$this->workspace->id}/workspace-reports/{$report->id}/export/png");

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'image/png');
    expect(strlen($response->getContent()))->toBeGreaterThan(100);
});

it('puede exportar un reporte público a PDF sin auth', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
        'title'        => 'Reporte Público PDF',
        'public_token' => 'pub-token-pdf-xyz',
        'published_at' => now(),
    ]);

    $response = $this->withoutMiddleware()->get('/api/v1/public/workspace-reports/pub-token-pdf-xyz/export/pdf');

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');
    expect(str_starts_with($response->getContent(), '%PDF'))->toBeTrue();
});

it('puede exportar un reporte público a PNG sin auth', function () {
    $report = WorkspaceReport::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id'     => $this->user->id,
        'title'        => 'Reporte Público PNG',
        'public_token' => 'pub-token-png-xyz',
        'published_at' => now(),
    ]);

    $response = $this->withoutMiddleware()->get('/api/v1/public/workspace-reports/pub-token-png-xyz/export/png');

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'image/png');
    expect(strlen($response->getContent()))->toBeGreaterThan(100);
});

