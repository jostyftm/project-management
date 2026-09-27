<?php

use App\Models\Module;
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

    $this->unstartedState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'To Do',
        'color' => '#64748b',
        'group' => 'UNSTARTED',
        'sequence' => 1,
    ]);

    $this->doneState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'color' => '#10b981',
        'group' => 'COMPLETED',
        'sequence' => 2,
    ]);
});

test('it creates a module and calculates aggregated progress', function () {
    $createResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->postJson("/api/v1/projects/{$this->project->id}/modules", [
            'name' => 'Autenticación & Seguridad',
            'description' => 'Módulo de login y roles',
            'status' => 'IN_PROGRESS',
        ]);

    $createResponse->assertStatus(201);
    $moduleId = $createResponse->json('data.id');

    $module = Module::find($moduleId);

    // Crear 2 items: 1 Done, 1 To Do
    $item1 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'title' => 'Login OAuth',
        'state_id' => $this->doneState->id,
        'created_by' => $this->user->id,
    ]);

    $item2 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 2,
        'title' => 'Reset Password',
        'state_id' => $this->unstartedState->id,
        'created_by' => $this->user->id,
    ]);

    $syncResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->postJson("/api/v1/modules/{$module->id}/work-items", [
            'work_item_ids' => [$item1->id, $item2->id],
        ]);

    $syncResponse->assertStatus(200);

    // Comprobar endpoint progress
    $progressResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson("/api/v1/modules/{$module->id}/progress");

    $progressResponse->assertStatus(200);
    $progressResponse->assertJsonPath('data.total_items', 2);
    $progressResponse->assertJsonPath('data.completed_items', 1);
    $progressResponse->assertJsonPath('data.progress_percentage', 50);
});
