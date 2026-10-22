<?php

use App\Models\Activity;
use App\Models\Cycle;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemDeliverable;
use App\Models\WorkItemType;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create(['name' => 'Scrum Master', 'email' => 'sm@example.com']);
    $this->dev = User::factory()->create(['name' => 'Dev Leader', 'email' => 'dev@example.com']);

    $this->workspace = Workspace::create([
        'name' => 'Agile Workspace',
        'slug' => 'agile-ws',
        'owner_id' => $this->user->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'OWNER',
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->dev->id,
        'role' => 'MEMBER',
    ]);

    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Scrum Project',
        'identifier' => 'SCRUM',
        'lead_id' => $this->user->id,
        'aging_threshold_days' => 5,
        'auto_rollup_parent' => true,
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->user->id,
        'role' => 'ADMIN',
        'capacity_points' => 20,
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->dev->id,
        'role' => 'MEMBER',
        'capacity_points' => 30,
    ]);

    $this->backlogState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'color' => '#6b7280',
        'group' => 'BACKLOG',
        'sequence' => 1,
    ]);

    $this->startedState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress',
        'color' => '#3b82f6',
        'group' => 'STARTED',
        'sequence' => 2,
        'wip_limit' => 3,
    ]);

    $this->completedState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'color' => '#10b981',
        'group' => 'COMPLETED',
        'sequence' => 3,
    ]);

    $this->storyType = WorkItemType::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Story',
        'icon' => 'bookmark',
        'color' => '#3b82f6',
    ]);
});

test('it retrieves sprint planning data with capacity and DoR evaluation', function () {
    $cycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1 - Autenticación',
        'sprint_goal' => 'Entregar el login y registro con JWT seguro',
        'capacity_points' => 45,
        'status' => 'DRAFT',
        'start_date' => Carbon::now()->addDay(),
        'end_date' => Carbon::now()->addDays(15),
    ]);

    // Item 1: Listo (Ready) para el sprint
    $readyItem = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'created_by' => $this->user->id,
        'title' => 'Formulario de Login',
        'description_html' => '<p>Como usuario quiero iniciar sesión con mi correo.</p>',
        'state_id' => $this->backlogState->id,
        'type_id' => $this->storyType->id,
        'estimate_points' => 5,
        'backlog_order' => 1,
    ]);
    $readyItem->assignees()->attach($this->dev->id);
    WorkItemDeliverable::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'work_item_id' => $readyItem->id,
        'created_by' => $this->user->id,
        'type' => 'DOD_CHECKLIST',
        'title' => 'Pruebas unitarias al 80%',
        'is_completed' => false,
    ]);

    // Item 2: No listo (sin estimación ni descripción)
    $notReadyItem = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 2,
        'created_by' => $this->user->id,
        'title' => 'Investigación OAuth',
        'description_html' => null,
        'state_id' => $this->backlogState->id,
        'type_id' => $this->storyType->id,
        'estimate_points' => null,
        'backlog_order' => 2,
    ]);

    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->getJson("/api/v1/cycles/{$cycle->id}/planning");

    $response->assertStatus(200)
        ->assertJsonPath('data.cycle.id', (string) $cycle->id)
        ->assertJsonPath('data.cycle.sprint_goal', 'Entregar el login y registro con JWT seguro')
        ->assertJsonPath('data.capacity.effective_capacity', 45)
        ->assertJsonPath('data.capacity.members_sum_capacity', 50);

    $backlog = $response->json('data.backlog');
    expect($backlog)->toHaveCount(2);

    // Verificar DoR del primer item
    $firstItem = collect($backlog)->firstWhere('id', (string) $readyItem->id);
    expect($firstItem['dor']['is_ready'])->toBeTrue();

    // Verificar DoR del segundo item (faltan puntos y descripción)
    $secondItem = collect($backlog)->firstWhere('id', (string) $notReadyItem->id);
    expect($secondItem['dor']['is_ready'])->toBeFalse();
    expect($secondItem['dor']['reasons'])->toContain('Sin estimación de puntos de historia');
});

test('it reorders backlog items by stack ranking', function () {
    $item1 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'created_by' => $this->user->id,
        'title' => 'Primer item',
        'state_id' => $this->backlogState->id,
        'backlog_order' => 1,
    ]);

    $item2 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 2,
        'created_by' => $this->user->id,
        'title' => 'Segundo item',
        'state_id' => $this->backlogState->id,
        'backlog_order' => 2,
    ]);

    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->postJson("/api/v1/projects/{$this->project->id}/work-items/reorder", [
            'items' => [
                ['id' => $item2->id, 'order' => 1],
                ['id' => $item1->id, 'order' => 2],
            ],
        ]);

    $response->assertStatus(200)
        ->assertJson(['success' => true]);

    expect((float) $item1->fresh()->sort_order)->toBe(2.0);
    expect((float) $item2->fresh()->sort_order)->toBe(1.0);
});

test('it reports blocker with reason and creates notification and activity', function () {
    $item = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'created_by' => $this->user->id,
        'title' => 'Integración con Gateway de Pago',
        'state_id' => $this->startedState->id,
        'is_blocked' => false,
    ]);
    $item->assignees()->attach($this->dev->id);

    // El dev reporta bloqueo
    $response = $this->actingAs($this->dev)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->putJson("/api/v1/work-items/{$item->id}", [
            'is_blocked' => true,
            'blocked_reason' => 'Esperando credenciales de Sandbox de Stripe',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.is_blocked', true)
        ->assertJsonPath('data.attributes.blocked_reason', 'Esperando credenciales de Sandbox de Stripe');

    // Comprobar registro de actividad
    $activity = Activity::where('entity_id', $item->id)
        ->where('action', 'BLOCKED')
        ->first();
    expect($activity)->not->toBeNull();
    expect($activity->changes_diff['blocked_reason'] ?? '')->toContain('Esperando credenciales de Sandbox de Stripe');

    // Comprobar notificación al admin/scrum master
    $notification = Notification::where('recipient_id', $this->user->id)
        ->where('type', 'BLOCKER_REPORTED')
        ->first();
    expect($notification)->not->toBeNull();
    expect($notification->title)->toContain('Impedimento');

    // Desbloquear tarea
    $unblockResponse = $this->actingAs($this->dev)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->putJson("/api/v1/work-items/{$item->id}", [
            'is_blocked' => false,
            'blocked_reason' => null,
        ]);

    $unblockResponse->assertStatus(200)
        ->assertJsonPath('data.attributes.is_blocked', false)
        ->assertJsonPath('data.attributes.blocked_reason', null);

    $unblockActivity = Activity::where('entity_id', $item->id)
        ->where('action', 'UNBLOCKED')
        ->first();
    expect($unblockActivity)->not->toBeNull();
});

test('it updates state wip limit and returns it in resource', function () {
    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->putJson("/api/v1/projects/{$this->project->id}/states/{$this->startedState->id}", [
            'wip_limit' => 5,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.id', (string) $this->startedState->id)
        ->assertJsonPath('data.attributes.wip_limit', 5);

    expect($this->startedState->fresh()->wip_limit)->toBe(5);
});

test('it generates daily standup report', function () {
    $cycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint Activo',
        'status' => 'CURRENT',
        'start_date' => Carbon::now()->subDays(2),
        'end_date' => Carbon::now()->addDays(8),
    ]);

    $itemInProgress = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'created_by' => $this->user->id,
        'title' => 'API de Usuarios',
        'state_id' => $this->startedState->id,
        'is_blocked' => true,
        'blocked_reason' => 'Servidor de pruebas caído',
        'last_state_change_at' => Carbon::now()->subDays(6), // Envejecida
    ]);
    $itemInProgress->assignees()->attach($this->dev->id);
    $cycle->workItems()->attach($itemInProgress->id);

    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/daily-standup");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'date',
                'project' => ['id', 'name', 'identifier'],
                'cycle' => ['id', 'name'],
                'summary' => ['total_members', 'total_blockers', 'aging_items_count'],
                'members',
            ],
        ]);

    $standup = $response->json('data');
    expect($standup['summary']['total_blockers'])->toBe(1);
    expect($standup['members'])->not->toBeEmpty();
});

test('it automatically rolls up parent state when all children are completed', function () {
    $parent = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'created_by' => $this->user->id,
        'title' => 'Historia Épica Padre',
        'state_id' => $this->startedState->id,
    ]);

    $child1 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'parent_id' => $parent->id,
        'sequence_id' => 2,
        'created_by' => $this->user->id,
        'title' => 'Subtarea 1',
        'state_id' => $this->completedState->id,
    ]);

    $child2 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'parent_id' => $parent->id,
        'sequence_id' => 3,
        'created_by' => $this->user->id,
        'title' => 'Subtarea 2',
        'state_id' => $this->startedState->id,
    ]);

    // Al completar la última subtarea pendiente:
    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->putJson("/api/v1/work-items/{$child2->id}", [
            'state_id' => $this->completedState->id,
        ]);

    $response->assertStatus(200);

    // El padre debe haberse completado automáticamente
    expect($parent->fresh()->state_id)->toBe($this->completedState->id);
});
