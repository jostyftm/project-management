<?php

use App\Models\Cycle;
use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::create([
        'name' => 'Acme Workspace',
        'slug' => 'acme-ws',
        'owner_id' => $this->user->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'OWNER',
    ]);

    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Acme Core',
        'identifier' => 'ACM',
    ]);

    $this->backlogState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'color' => '#94a3b8',
        'group' => 'BACKLOG',
        'sequence' => 1,
    ]);

    $this->inProgressState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress',
        'color' => '#f59e0b',
        'group' => 'STARTED',
        'sequence' => 2,
    ]);

    $this->doneState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'color' => '#10b981',
        'group' => 'COMPLETED',
        'sequence' => 3,
    ]);
});

test('it creates and lists cycles for a project', function () {
    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->postJson("/api/v1/projects/{$this->project->id}/cycles", [
            'name' => 'Sprint 1',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-14',
            'status' => 'CURRENT',
        ]);

    $response->assertStatus(201);
    $response->assertJsonPath('data.attributes.name', 'Sprint 1');

    $listResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/cycles");

    $listResponse->assertStatus(200);
    $listResponse->assertJsonCount(1, 'data');
});

test('it completes cycle, transfers incomplete items to backlog, and records snapshot for analytics', function () {
    $cycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint Alpha',
        'status' => 'CURRENT',
    ]);

    // Item 1: Terminado
    $itemDone = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'title' => 'Tarea Completada',
        'state_id' => $this->doneState->id,
        'created_by' => $this->user->id,
        'estimate_points' => 3,
    ]);

    // Item 2: En progreso (Incompleto)
    $itemIncomplete = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 2,
        'title' => 'Tarea En Curso',
        'state_id' => $this->inProgressState->id,
        'created_by' => $this->user->id,
        'estimate_points' => 5,
    ]);

    $cycle->workItems()->attach([$itemDone->id, $itemIncomplete->id]);

    // Finalizar ciclo con retorno al backlog por defecto
    $completeResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->postJson("/api/v1/cycles/{$cycle->id}/complete", [
            'transfer_target' => 'BACKLOG',
        ]);

    $completeResponse->assertStatus(200);
    $this->assertEquals('COMPLETED', $cycle->fresh()->status);

    // Verificar que el item incompleto regresó al backlog
    $this->assertEquals($this->backlogState->id, $itemIncomplete->fresh()->state_id);

    // Verificar que en la tabla pivote quedó registrado TRANSFERRED_TO_BACKLOG para estadísticas
    $this->assertDatabaseHas('cycle_work_items', [
        'cycle_id' => $cycle->id,
        'work_item_id' => $itemIncomplete->id,
        'status_at_completion' => 'TRANSFERRED_TO_BACKLOG',
    ]);

    $this->assertDatabaseHas('cycle_work_items', [
        'cycle_id' => $cycle->id,
        'work_item_id' => $itemDone->id,
        'status_at_completion' => 'COMPLETED',
    ]);

    // Verificar analytics
    $analyticsResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson("/api/v1/cycles/{$cycle->id}/analytics");

    $analyticsResponse->assertStatus(200);
    $analyticsResponse->assertJsonPath('data.metrics.total_items', 2);
    $analyticsResponse->assertJsonPath('data.metrics.completed_items', 1);
    $analyticsResponse->assertJsonPath('data.metrics.incomplete_items', 1);
    $analyticsResponse->assertJsonPath('data.metrics.completion_rate', 50);
});
