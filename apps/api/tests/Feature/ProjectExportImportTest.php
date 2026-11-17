<?php

use App\Mcp\Servers\ProjectManagementServer;
use App\Mcp\Tools\Projects\ExportProjectTool;
use App\Mcp\Tools\Projects\ImportProjectTool;
use App\Models\Cycle;
use App\Models\Label;
use App\Models\Milestone;
use App\Models\Module;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemDodItem;
use App\Models\WorkItemRelation;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Services\ProjectExportService;
use App\Services\ProjectImportService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;

beforeEach(function () {
    $this->user = User::factory()->create([
        'email' => 'lead@project.test',
        'is_instance_admin' => true,
    ]);
    $this->token = $this->user->createToken('test-token')->plainTextToken;

    $this->workspace = Workspace::create([
        'name' => 'Origen Workspace',
        'slug' => 'origen-ws',
        'owner_id' => $this->user->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'OWNER',
    ]);

    // Establecer contexto
    app()->instance('current_workspace_id', $this->workspace->id);
    app()->instance('current_workspace', $this->workspace);

    // Crear un proyecto de prueba rico en datos
    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Proyecto Alfa',
        'identifier' => 'ALFA',
        'description' => 'Descripción del proyecto de prueba',
        'icon' => '🚀',
        'is_public' => false,
        'lead_id' => $this->user->id,
        'estimate_system' => 'FIBONACCI',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->user->id,
        'role' => 'ADMIN',
    ]);

    // Estados
    $this->stateBacklog = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'group' => 'backlog',
        'sequence' => 0,
    ]);
    $this->stateDone = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'group' => 'completed',
        'sequence' => 1,
    ]);

    // Etiquetas
    $this->labelCore = Label::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Core',
        'color' => '#FF0000',
    ]);

    // Ciclo
    $this->cycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1',
        'status' => 'CURRENT',
        'start_date' => '2026-03-01',
        'end_date' => '2026-03-15',
        'owned_by' => $this->user->id,
    ]);

    // Módulo
    $this->module = Module::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Autenticación',
        'status' => 'IN_PROGRESS',
        'lead_id' => $this->user->id,
    ]);

    // Hito
    $this->milestone = Milestone::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'title' => 'MVP v1',
        'status' => 'UPCOMING',
    ]);

    // Work Item 1 (Épica Padre)
    $this->itemEpic = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'title' => 'Épica de Seguridad',
        'state_id' => $this->stateBacklog->id,
        'priority' => 'HIGH',
        'lead_id' => $this->user->id,
        'created_by' => $this->user->id,
    ]);

    // Work Item 2 (Hijo con DoD y asignaciones)
    $this->itemTask = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 2,
        'title' => 'Implementar OAuth2',
        'parent_id' => $this->itemEpic->id,
        'state_id' => $this->stateDone->id,
        'priority' => 'URGENT',
        'estimate_points' => 5,
        'lead_id' => $this->user->id,
        'milestone_id' => $this->milestone->id,
        'created_by' => $this->user->id,
    ]);
    $this->itemTask->cycles()->attach($this->cycle->id);
    $this->itemTask->modules()->attach($this->module->id);
    $this->itemTask->labels()->attach($this->labelCore->id);

    WorkItemDodItem::create([
        'work_item_id' => $this->itemTask->id,
        'title' => 'Pruebas de integración aprobadas',
        'is_completed' => true,
    ]);

    // Relación: Tarea 1 bloquea Tarea 2
    WorkItemRelation::create([
        'workspace_id' => $this->workspace->id,
        'source_id' => $this->itemEpic->id,
        'target_id' => $this->itemTask->id,
        'relation_type' => 'BLOCKS',
    ]);
});

it('exports a complete project with all related entities in canonical format', function () {
    $exporter = app(ProjectExportService::class);
    $exported = $exporter->export($this->project);

    expect($exported['version'])->toBe('1.0');
    expect($exported['project']['identifier'])->toBe('ALFA');
    expect($exported['project']['name'])->toBe('Proyecto Alfa');
    expect(count($exported['states']))->toBe(2);
    expect(count($exported['labels']))->toBe(1);
    expect(count($exported['cycles']))->toBe(1);
    expect(count($exported['modules']))->toBe(1);
    expect(count($exported['milestones']))->toBe(1);
    expect(count($exported['work_items']))->toBe(2);

    $taskData = collect($exported['work_items'])->firstWhere('sequence_id', 2);
    expect($taskData)->not->toBeNull();
    expect($taskData['parent_sequence_id'])->toBe(1);
    expect($taskData['cycles'])->toContain('Sprint 1');
    expect($taskData['modules'])->toContain('Autenticación');
    expect($taskData['labels'])->toContain('Core');
    expect(count($taskData['dod_items']))->toBe(1);
    expect($taskData['dod_items'][0]['title'])->toBe('Pruebas de integración aprobadas');

    $epicData = collect($exported['work_items'])->firstWhere('sequence_id', 1);
    expect(count($epicData['relations']))->toBe(1);
    expect($epicData['relations'][0]['target_sequence_id'])->toBe(2);
    expect($epicData['relations'][0]['relation_type'])->toBe('BLOCKS');
});

it('imports an exported project into another workspace with full fidelity', function () {
    $targetWorkspace = Workspace::create([
        'name' => 'Destino Workspace',
        'slug' => 'destino-ws',
        'owner_id' => $this->user->id,
    ]);

    $exporter = app(ProjectExportService::class);
    $data = $exporter->export($this->project);

    $importer = app(ProjectImportService::class);
    $result = $importer->import($data, $targetWorkspace, $this->user);

    expect($result['project']['identifier'])->toBe('ALFA');
    expect($result['counts']['work_items'])->toBe(2);
    expect($result['counts']['parents_linked'])->toBe(1);
    expect($result['counts']['dod_items_created'])->toBe(1);
    expect($result['counts']['relations_created'])->toBe(1);

    // Verificar entidades en base de datos para el nuevo proyecto
    $importedProject = Project::withoutGlobalScopes()
        ->where('workspace_id', $targetWorkspace->id)
        ->where('identifier', 'ALFA')
        ->first();

    expect($importedProject)->not->toBeNull();
    expect($importedProject->name)->toBe('Proyecto Alfa');

    $items = WorkItem::withoutGlobalScopes()->where('project_id', $importedProject->id)->get();
    expect($items->count())->toBe(2);

    $importedEpic = $items->firstWhere('sequence_id', 1);
    $importedTask = $items->firstWhere('sequence_id', 2);

    expect($importedTask->parent_id)->toBe($importedEpic->id);
    expect($importedTask->cycles()->count())->toBe(1);
    expect($importedTask->modules()->count())->toBe(1);
    expect($importedTask->labels()->count())->toBe(1);
    expect($importedTask->dodItems()->count())->toBe(1);

    $relation = WorkItemRelation::where('source_id', $importedEpic->id)->first();
    expect($relation)->not->toBeNull();
    expect($relation->target_id)->toBe($importedTask->id);
    expect($relation->relation_type)->toBe('BLOCKS');
});

it('resolves duplicate project identifiers by generating a unique suffix', function () {
    $exporter = app(ProjectExportService::class);
    $data = $exporter->export($this->project);

    $importer = app(ProjectImportService::class);
    // Importar en el mismo workspace sin force -> debe generar ALFA2
    $result = $importer->import($data, $this->workspace, $this->user);

    expect($result['project']['identifier'])->not->toBe('ALFA');
    expect($result['project']['identifier'])->toStartWith('ALFA');

    $secondProject = Project::withoutGlobalScopes()->find($result['project']['id']);
    expect($secondProject)->not->toBeNull();
    expect($secondProject->identifier)->toBe('ALFA2');
});

it('exports and imports projects via REST API endpoints', function () {
    // 1. Exportar vía API
    $exportResponse = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/export");

    $exportResponse->assertStatus(200)
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonPath('version', '1.0')
        ->assertJsonPath('project.identifier', 'ALFA');

    $exportedJson = $exportResponse->getContent();

    // 2. Importar vía API en otro workspace
    $newWs = Workspace::create([
        'name' => 'API Import WS',
        'slug' => 'api-import-ws',
        'owner_id' => $this->user->id,
    ]);

    $file = UploadedFile::fake()->createWithContent('alfa-export.json', $exportedJson);

    $importResponse = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $newWs->id,
    ])->post('/api/v1/projects/import', [
        'file' => $file,
        'name' => 'Alfa Clonado',
    ]);

    $importResponse->assertStatus(201)
        ->assertJsonPath('project.name', 'Alfa Clonado')
        ->assertJsonPath('project.identifier', 'ALFA')
        ->assertJsonPath('counts.work_items', 2);
});

it('exports and imports projects via MCP tools', function () {
    // 1. Export Tool
    $exportToolRes = ProjectManagementServer::tool(ExportProjectTool::class, [
        'project' => 'ALFA',
    ]);
    $exportToolRes->assertOk()->assertSee('"version": "1.0"');

    // 2. Import Tool
    $targetWs = Workspace::create([
        'name' => 'MCP Workspace',
        'slug' => 'mcp-ws',
        'owner_id' => $this->user->id,
    ]);

    $exporter = app(ProjectExportService::class);
    $data = $exporter->export($this->project);

    $importToolRes = ProjectManagementServer::tool(ImportProjectTool::class, [
        'json_content' => json_encode($data),
        'workspace' => 'mcp-ws',
        'name' => 'MCP Importado',
        'identifier' => 'MCPI',
    ]);

    $importToolRes->assertOk()
        ->assertSee('MCPI')
        ->assertSee('MCP Importado');
});

it('exports and imports projects via Artisan commands', function () {
    $tempExportPath = storage_path('app/exports/test_export.json');
    if (file_exists($tempExportPath)) {
        unlink($tempExportPath);
    }

    // 1. Artisan export
    $exportExit = Artisan::call('project:export', [
        'project' => 'ALFA',
        '--path' => $tempExportPath,
    ]);
    expect($exportExit)->toBe(0);
    expect(file_exists($tempExportPath))->toBeTrue();

    // 2. Artisan import
    $cliWs = Workspace::create([
        'name' => 'CLI Workspace',
        'slug' => 'cli-ws',
        'owner_id' => $this->user->id,
    ]);

    $importExit = Artisan::call('project:import', [
        'file' => $tempExportPath,
        '--workspace' => 'cli-ws',
        '--identifier' => 'CLIX',
        '--name' => 'CLI Project',
    ]);
    expect($importExit)->toBe(0);

    $cliProject = Project::withoutGlobalScopes()
        ->where('workspace_id', $cliWs->id)
        ->where('identifier', 'CLIX')
        ->first();

    expect($cliProject)->not->toBeNull();
    expect($cliProject->name)->toBe('CLI Project');

    if (file_exists($tempExportPath)) {
        unlink($tempExportPath);
    }
});
