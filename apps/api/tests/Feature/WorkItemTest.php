<?php

use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use App\Models\WorkspaceMember;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('test-token')->plainTextToken;

    $this->workspace = Workspace::create([
        'name' => 'Product Team',
        'slug' => 'product-team',
        'owner_id' => $this->user->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'OWNER',
    ]);

    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Backend API',
        'identifier' => 'API',
        'lead_id' => $this->user->id,
    ]);

    $this->stateTodo = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'To Do',
        'group' => 'UNSTARTED',
        'is_default' => true,
        'sequence' => 1,
    ]);

    $this->stateDone = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'group' => 'COMPLETED',
        'is_default' => false,
        'sequence' => 2,
    ]);
});

it('creates a work item with auto-incremented sequence_id', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/work-items", [
        'title' => 'Configurar CORS y Sanctum',
        'priority' => 'HIGH',
        'estimate_points' => 3.5,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.title', 'Configurar CORS y Sanctum')
        ->assertJsonPath('data.attributes.sequence_id', 1)
        ->assertJsonPath('data.attributes.identifier', 'API-1')
        ->assertJsonPath('data.attributes.priority', 'HIGH');

    // Crear un segundo item y verificar sequence_id = 2
    $response2 = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/work-items", [
        'title' => 'Diseñar vista Kanban interactiva',
        'priority' => 'URGENT',
    ]);

    $response2->assertStatus(201)
        ->assertJsonPath('data.attributes.sequence_id', 2)
        ->assertJsonPath('data.attributes.identifier', 'API-2');

    // Verificar log de auditoría en la tabla activities
    $this->assertDatabaseHas('activities', [
        'workspace_id' => $this->workspace->id,
        'entity_type' => 'WORK_ITEM',
        'action' => 'CREATED',
    ]);
});

it('updates work item state and records STATE_CHANGED activity', function () {
    $workItem = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'title' => 'Test Task',
        'state_id' => $this->stateTodo->id,
        'priority' => 'LOW',
        'created_by' => $this->user->id,
    ]);

    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$workItem->id}", [
        'state_id' => $this->stateDone->id,
        'priority' => 'MEDIUM',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.relationships.state.id', (string) $this->stateDone->id);

    $this->assertDatabaseHas('activities', [
        'workspace_id' => $this->workspace->id,
        'entity_id' => $workItem->id,
        'action' => 'STATE_CHANGED',
    ]);
});

it('prevents cross-tenant access to work items', function () {
    $otherWorkspace = Workspace::create([
        'name' => 'Competitor Corp',
        'slug' => 'competitor',
        'owner_id' => User::factory()->create()->id,
    ]);

    $otherProject = Project::create([
        'workspace_id' => $otherWorkspace->id,
        'name' => 'Secret Project',
        'identifier' => 'SEC',
    ]);

    $otherState = State::create([
        'workspace_id' => $otherWorkspace->id,
        'project_id' => $otherProject->id,
        'name' => 'Todo',
        'group' => 'UNSTARTED',
    ]);

    $otherItem = WorkItem::create([
        'workspace_id' => $otherWorkspace->id,
        'project_id' => $otherProject->id,
        'sequence_id' => 1,
        'title' => 'Top Secret Item',
        'state_id' => $otherState->id,
        'created_by' => $otherWorkspace->owner_id,
    ]);

    // Usuario intenta consultar item del otro workspace enviando su propio workspace header
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/work-items/{$otherItem->id}");

    $response->assertStatus(404);
});
