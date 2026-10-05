<?php

use App\Models\Cycle;
use App\Models\Page;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Dueño del Workspace
    $this->owner = User::factory()->create(['name' => 'Workspace Owner']);
    $this->ownerToken = $this->owner->createToken('owner-token')->plainTextToken;

    $this->workspace = Workspace::create([
        'name' => 'Security Test Workspace',
        'slug' => 'sec-ws',
        'owner_id' => $this->owner->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'role' => 'OWNER',
    ]);

    // Usuario 1: ADMIN del proyecto
    $this->adminUser = User::factory()->create(['name' => 'Project Admin']);
    $this->adminToken = $this->adminUser->createToken('admin-token')->plainTextToken;
    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->adminUser->id,
        'role' => 'MEMBER',
    ]);

    // Usuario 2: MEMBER del proyecto
    $this->memberUser = User::factory()->create(['name' => 'Project Member']);
    $this->memberToken = $this->memberUser->createToken('member-token')->plainTextToken;
    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->memberUser->id,
        'role' => 'MEMBER',
    ]);

    // Usuario 3: No es miembro del proyecto pero sí del workspace
    $this->nonMemberUser = User::factory()->create(['name' => 'Non Member']);
    $this->nonMemberToken = $this->nonMemberUser->createToken('non-member-token')->plainTextToken;
    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->nonMemberUser->id,
        'role' => 'MEMBER',
    ]);

    // Proyecto de prueba
    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Confidential Project',
        'identifier' => 'CONF',
        'lead_id' => $this->adminUser->id,
    ]);

    // Asignar roles en project_members
    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->adminUser->id,
        'role' => 'ADMIN',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->memberUser->id,
        'role' => 'MEMBER',
    ]);

    // Estado por defecto
    $this->state = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'color' => '#64748b',
        'group' => 'BACKLOG',
        'sequence' => 0,
    ]);
});

test('non-member user receives 404 when attempting to access project or subroutes', function () {
    // 1. Acceso directo al proyecto -> 404 Not Found
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->nonMemberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}");

    $response->assertStatus(404);

    // 2. Sub-rutas (work-items, cycles, etc.) -> 404 Not Found
    $this->withHeaders([
        'Authorization' => "Bearer {$this->nonMemberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/work-items")
        ->assertStatus(404);

    $this->withHeaders([
        'Authorization' => "Bearer {$this->nonMemberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/cycles")
        ->assertStatus(404);
});

test('project member can read work-items and cycles but cannot see settings, activities or automations', function () {
    // 1. Puede consultar el proyecto
    $showResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}");

    $showResp->assertStatus(200)
        ->assertJsonPath('data.attributes.current_user_role', 'MEMBER');

    // 2. Puede visualizar work items y ciclos
    $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/work-items")
        ->assertStatus(200);

    $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/cycles")
        ->assertStatus(200);

    // 3. NO puede acceder a actividades -> 404
    $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/activities")
        ->assertStatus(404);

    // 4. NO puede acceder a automatizaciones -> 404
    $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/automation-rules")
        ->assertStatus(404);

    $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/recurring-work-items")
        ->assertStatus(404);

    // 5. NO puede actualizar configuración del proyecto -> 404
    $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/projects/{$this->project->id}", [
        'name' => 'Hacked Name',
    ])->assertStatus(404);
});

test('member cannot create or update work items or cycles', function () {
    // Intento de crear work item por MEMBER -> 404
    $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/work-items", [
        'title' => 'Member Work Item',
        'state_id' => $this->state->id,
    ])->assertStatus(404);

    // Intento de crear ciclo por MEMBER -> 404
    $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/cycles", [
        'name' => 'Member Sprint',
    ])->assertStatus(404);
});

test('member assigned to work item can update its state', function () {
    $inProgressState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress',
        'color' => '#3b82f6',
        'group' => 'STARTED',
        'sequence' => 1,
    ]);

    // Work item asignado al miembro como lead
    $item = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'title' => 'Assigned Task',
        'state_id' => $this->state->id,
        'lead_id' => $this->memberUser->id,
        'sequence_id' => 101,
        'created_by' => $this->adminUser->id,
    ]);

    // El miembro asignado actualiza el estado -> 200 OK
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$item->id}", [
        'state_id' => $inProgressState->id,
    ]);

    $response->assertStatus(200);
    expect($item->fresh()->state_id)->toBe($inProgressState->id);

    // Intento de actualizar otros campos (como title o priority) por el miembro asignado -> 403 Forbidden
    $forbiddenResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$item->id}", [
        'title' => 'Member Trying To Rename',
    ]);

    $forbiddenResp->assertStatus(403);

    // Caso 2: Asignado mediante assignees pivot (sin ser lead)
    $item2 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'title' => 'Assigned via Pivot',
        'state_id' => $this->state->id,
        'lead_id' => $this->adminUser->id,
        'sequence_id' => 103,
        'created_by' => $this->adminUser->id,
    ]);
    $item2->assignees()->attach($this->memberUser->id);

    $response2 = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$item2->id}", [
        'state_id' => $inProgressState->id,
    ]);

    $response2->assertStatus(200);
    expect($item2->fresh()->state_id)->toBe($inProgressState->id);
});

test('member not assigned to work item cannot update its state', function () {
    $inProgressState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress 2',
        'color' => '#3b82f6',
        'group' => 'STARTED',
        'sequence' => 2,
    ]);

    // Work item asignado al admin (no al member)
    $unassignedItem = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'title' => 'Admin Only Task',
        'state_id' => $this->state->id,
        'lead_id' => $this->adminUser->id,
        'sequence_id' => 102,
        'created_by' => $this->adminUser->id,
    ]);

    // El miembro no asignado intenta cambiar estado -> 404 Not Found (seguridad por diseño)
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$unassignedItem->id}", [
        'state_id' => $inProgressState->id,
    ]);

    $response->assertStatus(404);
});

test('member can create and edit wiki pages but can ONLY delete pages they created', function () {
    // 1. Admin crea una página
    $adminPage = Page::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'title' => 'Admin Documentation',
        'created_by' => $this->adminUser->id,
    ]);

    // 2. Member crea su propia página
    $memberPageResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/pages", [
        'title' => 'My Personal Notes',
    ]);

    $memberPageResp->assertStatus(201);
    $memberPageId = $memberPageResp->json('data.id');

    // 3. Member puede editar la página
    $updateResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/pages/{$memberPageId}", [
        'title' => 'My Updated Notes',
    ]);
    $updateResp->assertStatus(200);

    // 4. Member intenta eliminar la página creada por el ADMIN -> 403 Forbidden
    $delAdminPageResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->deleteJson("/api/v1/pages/{$adminPage->id}");

    $delAdminPageResp->assertStatus(403);
    $this->assertDatabaseHas('pages', ['id' => $adminPage->id]);

    // 5. Member elimina su propia página -> 200 OK
    $delOwnResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->deleteJson("/api/v1/pages/{$memberPageId}");

    $delOwnResp->assertStatus(200);
    $this->assertSoftDeleted('pages', ['id' => $memberPageId]);
});

test('admin can manage everything and delete any wiki page', function () {
    // 1. Admin crea página de otro usuario y la elimina
    $otherPage = Page::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'title' => 'Page from someone else',
        'created_by' => $this->memberUser->id,
    ]);

    $delResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->deleteJson("/api/v1/pages/{$otherPage->id}");

    $delResp->assertStatus(200);
    $this->assertSoftDeleted('pages', ['id' => $otherPage->id]);

    // 2. Admin accede a actividades y automatizaciones
    $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/activities")
        ->assertStatus(200);

    $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/projects/{$this->project->id}/automation-rules")
        ->assertStatus(200);
});

test('project listing returns empty for user belonging to no project in workspace', function () {
    $nonMemberResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->nonMemberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson('/api/v1/projects');

    $nonMemberResp->assertStatus(200);
    expect($nonMemberResp->json('data'))->toHaveCount(0);
});

test('project listing only returns projects where user is member', function () {
    // Proyecto 2 en el mismo workspace
    $project2 = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Project Two',
        'identifier' => 'PR2',
    ]);

    // memberUser se agrega a project2
    ProjectMember::create([
        'project_id' => $project2->id,
        'user_id' => $this->memberUser->id,
        'role' => 'MEMBER',
    ]);

    // Proyecto 3 en el mismo workspace donde memberUser NO está
    Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Secret Project Three',
        'identifier' => 'PR3',
    ]);

    $memberResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson('/api/v1/projects');

    $memberResp->assertStatus(200);
    expect($memberResp->json('data'))->toHaveCount(2);
    $memberResp->assertJsonFragment(['identifier' => 'CONF'])
        ->assertJsonFragment(['identifier' => 'PR2'])
        ->assertJsonMissing(['identifier' => 'PR3']);
});

test('workspace owner sees all projects in workspace', function () {
    Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Project Two',
        'identifier' => 'PR2',
    ]);

    $ownerResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->ownerToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson('/api/v1/projects');

    $ownerResp->assertStatus(200);
    expect($ownerResp->json('data'))->toHaveCount(2);
});

test('instance admin sees all projects in workspace', function () {
    Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Project Two',
        'identifier' => 'PR2',
    ]);

    $superadmin = User::factory()->create(['is_instance_admin' => true]);
    $superToken = $superadmin->createToken('super-token')->plainTextToken;

    $superResp = $this->withHeaders([
        'Authorization' => "Bearer {$superToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson('/api/v1/projects');

    $superResp->assertStatus(200);
    expect($superResp->json('data'))->toHaveCount(2);
});
