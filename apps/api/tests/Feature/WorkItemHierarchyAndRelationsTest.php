<?php

use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemType;
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
        'estimate_system' => 'TSHIRT',
    ]);

    $this->state = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'To Do',
        'color' => '#64748b',
        'group' => 'UNSTARTED',
        'sequence' => 1,
    ]);

    $this->bugType = WorkItemType::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Bug',
        'icon' => 'alert-circle',
        'color' => '#ef4444',
    ]);
});

test('it creates work item with type and estimate value and supports sub-items hierarchy', function () {
    // 1. Crear item padre
    $parentResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->postJson("/api/v1/projects/{$this->project->id}/work-items", [
            'title' => 'Historia Principal',
            'state_id' => $this->state->id,
            'type_id' => $this->bugType->id,
            'estimate_value' => 'L',
        ]);

    $parentResponse->assertStatus(201);
    $parentId = $parentResponse->json('data.id');
    $this->assertEquals('L', $parentResponse->json('data.attributes.estimate_value'));
    $this->assertEquals('Bug', $parentResponse->json('data.relationships.type.attributes.name'));

    // 2. Crear subtarea hija
    $childResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->postJson("/api/v1/projects/{$this->project->id}/work-items", [
            'title' => 'Subtarea Hija',
            'state_id' => $this->state->id,
            'parent_id' => $parentId,
            'estimate_value' => 'S',
        ]);

    $childResponse->assertStatus(201);
    $childId = $childResponse->json('data.id');
    $this->assertEquals((string) $parentId, $childResponse->json('data.relationships.parent.data.id'));

    // 3. Crear relación BLOCKS
    $relResponse = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->postJson("/api/v1/work-items/{$parentId}/relations", [
            'target_id' => $childId,
            'relation_type' => 'BLOCKS',
        ]);

    $relResponse->assertStatus(201);
    $relationId = $relResponse->json('data.id');

    $this->assertDatabaseHas('work_item_relations', [
        'id' => $relationId,
        'source_id' => $parentId,
        'target_id' => $childId,
        'relation_type' => 'BLOCKS',
    ]);
});

test('it returns priority, dates, and lead on sub_items when fetching parent work item', function () {
    // 1. Crear item padre
    $parent = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 10,
        'title' => 'Tarea Padre con Subtareas',
        'state_id' => $this->state->id,
        'created_by' => $this->user->id,
        'priority' => 'HIGH',
    ]);

    // 2. Crear subtarea con prioridad, fechas y lead
    $subItem = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 11,
        'title' => 'Subtarea Detallada',
        'parent_id' => $parent->id,
        'state_id' => $this->state->id,
        'created_by' => $this->user->id,
        'priority' => 'URGENT',
        'start_date' => '2026-10-05',
        'target_date' => '2026-10-15',
        'lead_id' => $this->user->id,
    ]);

    // 3. Consultar padre vía endpoint GET
    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson("/api/v1/work-items/{$parent->id}");

    $response->assertStatus(200);
    $subItems = $response->json('data.relationships.sub_items');
    $this->assertCount(1, $subItems);
    $this->assertEquals((string) $subItem->id, $subItems[0]['id']);
    $this->assertEquals('URGENT', $subItems[0]['priority']);
    $this->assertEquals('2026-10-05', $subItems[0]['start_date']);
    $this->assertEquals('2026-10-15', $subItems[0]['target_date']);
    $this->assertEquals((string) $this->state->id, $subItems[0]['state']['id']);
    $this->assertEquals((string) $this->user->id, $subItems[0]['lead']['id']);
});
