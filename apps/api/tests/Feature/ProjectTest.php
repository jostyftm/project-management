<?php

use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('test-token')->plainTextToken;

    $this->workspace = Workspace::create([
        'name' => 'Engineering Hub',
        'slug' => 'eng-hub',
        'owner_id' => $this->user->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'OWNER',
    ]);
});

it('creates a project and automatically initializes the 5 default Plane states', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson('/api/v1/projects', [
        'name' => 'Plane Web App',
        'identifier' => 'PLN',
        'description' => 'Aplicación oficial frontend y backend',
        'icon' => '🚀',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'Plane Web App')
        ->assertJsonPath('data.attributes.identifier', 'PLN');

    $projectId = $response->json('data.id');

    // Verificar que los 5 estados por defecto de Plane fueron creados
    $this->assertDatabaseHas('states', ['project_id' => $projectId, 'name' => 'Backlog', 'group' => 'BACKLOG']);
    $this->assertDatabaseHas('states', ['project_id' => $projectId, 'name' => 'To Do', 'group' => 'UNSTARTED']);
    $this->assertDatabaseHas('states', ['project_id' => $projectId, 'name' => 'In Progress', 'group' => 'STARTED']);
    $this->assertDatabaseHas('states', ['project_id' => $projectId, 'name' => 'Done', 'group' => 'COMPLETED']);
    $this->assertDatabaseHas('states', ['project_id' => $projectId, 'name' => 'Cancelled', 'group' => 'CANCELLED']);

    // Verificar etiquetas iniciales
    $this->assertDatabaseHas('labels', ['project_id' => $projectId, 'name' => 'Bug']);
    $this->assertDatabaseHas('labels', ['project_id' => $projectId, 'name' => 'Feature']);
});

it('lists projects strictly isolated to the active workspace', function () {
    // Proyecto en workspace del usuario
    $project1 = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'My Workspace Project',
        'identifier' => 'MYP',
        'lead_id' => $this->user->id,
    ]);

    // Otro workspace y proyecto ajeno
    $otherWorkspace = Workspace::create([
        'name' => 'Other Workspace',
        'slug' => 'other-ws',
        'owner_id' => User::factory()->create()->id,
    ]);

    $project2 = Project::create([
        'workspace_id' => $otherWorkspace->id,
        'name' => 'Alien Project',
        'identifier' => 'ALN',
    ]);

    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson('/api/v1/projects');

    $response->assertStatus(200)
        ->assertJsonFragment(['name' => 'My Workspace Project'])
        ->assertJsonMissing(['name' => 'Alien Project']);
});

it('creates a custom state and label for a project', function () {
    $project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'DevOps Pipeline',
        'identifier' => 'OPS',
        'lead_id' => $this->user->id,
    ]);

    $stateResponse = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$project->id}/states", [
        'name' => 'In Code Review',
        'group' => 'STARTED',
        'color' => '#8B5CF6',
        'sequence' => 3,
    ]);

    $stateResponse->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'In Code Review')
        ->assertJsonPath('data.attributes.group', 'STARTED');

    $labelResponse = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$project->id}/labels", [
        'name' => 'Security',
        'color' => '#DC2626',
        'description' => 'Incidencias relacionadas con seguridad',
    ]);

    $labelResponse->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'Security');
});
