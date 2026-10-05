<?php

use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\View;
use App\Models\WorkItem;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->otherUser = User::factory()->create();

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

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->otherUser->id,
        'role' => 'MEMBER',
    ]);

    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Acme Core',
        'identifier' => 'ACM',
    ]);

    \App\Models\ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->otherUser->id,
        'role' => 'MEMBER',
    ]);

    $this->state = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'To Do',
        'color' => '#64748b',
        'group' => 'UNSTARTED',
        'sequence' => 1,
    ]);
});

test('it creates and lists saved views strictly for the creator', function () {
    // 1. Crear vista con usuario actual
    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->postJson("/api/v1/projects/{$this->project->id}/views", [
            'name' => 'Mis Bugs Urgentes',
            'filters' => ['priorities' => ['URGENT', 'HIGH']],
            'display_filters' => ['layout' => 'kanban'],
        ]);

    $response->assertStatus(201);
    $viewId = $response->json('data.id');

    // 2. El creador puede listarla
    $listResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/views");

    $listResponse->assertStatus(200);
    $listResponse->assertJsonCount(1, 'data');

    // 3. Otro usuario NO ve la vista privada (Regla: "1. Solo para el creador")
    $otherListResponse = $this->actingAs($this->otherUser)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/views");

    $otherListResponse->assertStatus(200);
    $otherListResponse->assertJsonCount(0, 'data');

    // 4. Otro usuario no puede consultar la vista ajena
    $forbiddenResponse = $this->actingAs($this->otherUser)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson("/api/v1/views/{$viewId}");

    $forbiddenResponse->assertStatus(403);
});

test('it filters your work by tabs (assigned, created, drafts)', function () {
    // Item asignado a $this->user
    $itemAssigned = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'title' => 'Tarea Asignada a Mí',
        'state_id' => $this->state->id,
        'created_by' => $this->otherUser->id,
        'is_draft' => false,
    ]);
    $itemAssigned->assignees()->attach($this->user->id);

    // Item creado por $this->user
    $itemCreated = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 2,
        'title' => 'Tarea Creada por Mí',
        'state_id' => $this->state->id,
        'created_by' => $this->user->id,
        'is_draft' => false,
    ]);

    // Item borrador por $this->user
    $itemDraft = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 3,
        'title' => 'Borrador Guardado',
        'state_id' => $this->state->id,
        'created_by' => $this->user->id,
        'is_draft' => true,
    ]);

    // Pestaña "assigned"
    $assignedRes = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson('/api/v1/your-work?tab=assigned');
    $assignedRes->assertStatus(200);
    $assignedRes->assertJsonCount(1, 'data');
    $this->assertEquals($itemAssigned->id, $assignedRes->json('data.0.id'));

    // Pestaña "created"
    $createdRes = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson('/api/v1/your-work?tab=created');
    $createdRes->assertStatus(200);
    $createdRes->assertJsonCount(1, 'data');
    $this->assertEquals($itemCreated->id, $createdRes->json('data.0.id'));

    // Pestaña "drafts"
    $draftsRes = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson('/api/v1/your-work?tab=drafts');
    $draftsRes->assertStatus(200);
    $draftsRes->assertJsonCount(1, 'data');
    $this->assertEquals($itemDraft->id, $draftsRes->json('data.0.id'));
});
