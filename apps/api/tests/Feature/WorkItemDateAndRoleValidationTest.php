<?php

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
    // Propietario del Workspace
    $this->owner = User::factory()->create(['name' => 'Workspace Owner']);
    $this->workspace = Workspace::create([
        'name' => 'Date Test Workspace',
        'slug' => 'date-ws',
        'owner_id' => $this->owner->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'role' => 'OWNER',
    ]);

    // Admin del proyecto
    $this->adminUser = User::factory()->create(['name' => 'Project Admin']);
    $this->adminToken = $this->adminUser->createToken('admin-token')->plainTextToken;
    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->adminUser->id,
        'role' => 'MEMBER',
    ]);

    // Miembro del proyecto
    $this->memberUser = User::factory()->create(['name' => 'Project Member']);
    $this->memberToken = $this->memberUser->createToken('member-token')->plainTextToken;
    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->memberUser->id,
        'role' => 'MEMBER',
    ]);

    // Proyecto
    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Date Validation Project',
        'identifier' => 'DATE',
        'lead_id' => $this->adminUser->id,
    ]);

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

    $this->state = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Todo',
        'color' => '#64748b',
        'group' => 'UNSTARTED',
        'sequence' => 0,
    ]);

    $this->workItem = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'title' => 'Sample Work Item',
        'state_id' => $this->state->id,
        'lead_id' => $this->memberUser->id,
        'sequence_id' => 1,
        'created_by' => $this->adminUser->id,
        'start_date' => '2026-10-10',
        'target_date' => '2026-10-20',
    ]);
});

test('admin can update start_date and target_date', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$this->workItem->id}", [
        'start_date' => '2026-10-12',
        'target_date' => '2026-10-25',
    ]);

    $response->assertStatus(200);
    $fresh = $this->workItem->fresh();
    expect($fresh->start_date?->format('Y-m-d'))->toBe('2026-10-12')
        ->and($fresh->target_date?->format('Y-m-d'))->toBe('2026-10-25');
});

test('admin can clear start_date and target_date by setting to null', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$this->workItem->id}", [
        'start_date' => null,
        'target_date' => null,
    ]);

    $response->assertStatus(200);
    $fresh = $this->workItem->fresh();
    expect($fresh->start_date)->toBeNull()
        ->and($fresh->target_date)->toBeNull();
});

test('member cannot update start_date or target_date and receives 403', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$this->workItem->id}", [
        'start_date' => '2026-10-15',
    ]);

    $response->assertStatus(403);

    $response2 = $this->withHeaders([
        'Authorization' => "Bearer {$this->memberToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$this->workItem->id}", [
        'target_date' => '2026-10-25',
    ]);

    $response2->assertStatus(403);
});

test('validation fails with 422 if start_date is after target_date', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$this->workItem->id}", [
        'start_date' => '2026-10-25',
        'target_date' => '2026-10-15',
    ]);

    $response->assertStatus(422);

    // Actualizando sólo fecha de inicio cuando la fecha objetivo en BD es previa
    $response2 = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/work-items/{$this->workItem->id}", [
        'start_date' => '2026-10-28', // posterior a target_date en BD (2026-10-20)
    ]);

    $response2->assertStatus(422);
});
