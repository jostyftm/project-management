<?php

use App\Models\Cycle;
use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemDeliverable;
use App\Models\WorkItemDodItem;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->user = User::factory()->create([
        'is_instance_admin' => true,
    ]);
    $this->workspace = Workspace::create([
        'name' => 'Acme Test Workspace',
        'slug' => 'acme-test-ws',
        'owner_id' => $this->user->id,
    ]);
    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Test Project',
        'identifier' => 'PRJ',
    ]);
    $this->state = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'color' => '#94a3b8',
        'group' => 'UNSTARTED',
        'sequence' => 1,
    ]);
    app()->instance('current_workspace_id', $this->workspace->id);
});

it('allows instance admin to generate password reset link for any user', function () {
    $targetUser = User::factory()->create([
        'email' => 'target.user@example.com',
        'name' => 'Target User',
    ]);

    $response = $this->actingAs($this->user)
        ->postJson("/api/v1/instance-admin/users/{$targetUser->id}/reset-password-link");

    $response->assertStatus(200)
        ->assertJsonPath('data.email', 'target.user@example.com')
        ->assertJsonPath('data.expires_in_minutes', 10);

    $resetUrl = $response->json('data.reset_url');
    expect($resetUrl)->toContain('/reset-password?token=')
        ->and($resetUrl)->toContain('email=target.user%40example.com');

    // Token exists in database
    expect(DB::table('password_reset_tokens')->where('email', 'target.user@example.com')->exists())->toBeTrue();
});

it('filters your work items by project_id in query parameters', function () {
    $projectB = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Project Beta',
        'identifier' => 'BET',
    ]);

    $stateB = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $projectB->id,
        'name' => 'To Do',
        'color' => '#3b82f6',
        'group' => 'UNSTARTED',
        'sequence' => 1,
    ]);

    // Item in Project A
    $itemA = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'state_id' => $this->state->id,
        'sequence_id' => 1,
        'title' => 'Tarea en Proyecto A',
        'lead_id' => $this->user->id,
        'created_by' => $this->user->id,
        'is_draft' => false,
    ]);

    // Item in Project B
    $itemB = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $projectB->id,
        'state_id' => $stateB->id,
        'sequence_id' => 1,
        'title' => 'Tarea en Proyecto B',
        'lead_id' => $this->user->id,
        'created_by' => $this->user->id,
        'is_draft' => false,
    ]);

    // Filter by Project A
    $responseA = $this->actingAs($this->user)
        ->getJson("/api/v1/your-work?tab=assigned&project_id={$this->project->id}");

    $responseA->assertStatus(200);
    $idsA = collect($responseA->json('data'))->pluck('id')->all();
    expect($idsA)->toContain((string) $itemA->id)
        ->and($idsA)->not->toContain((string) $itemB->id);

    // Filter by Project B
    $responseB = $this->actingAs($this->user)
        ->getJson("/api/v1/your-work?tab=assigned&project_id={$projectB->id}");

    $responseB->assertStatus(200);
    $idsB = collect($responseB->json('data'))->pluck('id')->all();
    expect($idsB)->toContain((string) $itemB->id)
        ->and($idsB)->not->toContain((string) $itemA->id);
});

it('exposes deliverables and dod items counts on work items in your work and list', function () {
    $item = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'state_id' => $this->state->id,
        'sequence_id' => 2,
        'title' => 'Tarea con entregables',
        'lead_id' => $this->user->id,
        'created_by' => $this->user->id,
        'is_draft' => false,
    ]);

    WorkItemDeliverable::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'work_item_id' => $item->id,
        'created_by' => $this->user->id,
        'title' => 'Captura de pantalla',
        'type' => 'QA_EVIDENCE',
        'status' => 'APPROVED',
    ]);

    WorkItemDodItem::create([
        'work_item_id' => $item->id,
        'title' => 'Criterio de aceptación 1',
        'is_completed' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson("/api/v1/your-work?tab=assigned&project_id={$this->project->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.0.attributes.deliverables_count', 1)
        ->assertJsonPath('data.0.attributes.approved_deliverables_count', 1)
        ->assertJsonPath('data.0.attributes.dod_items_count', 1)
        ->assertJsonPath('data.0.attributes.completed_dod_items_count', 1);
});

it('computes cycle analytics with scope dynamics and item categorization', function () {
    $cycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 42 Test',
        'start_date' => now()->subDays(5)->format('Y-m-d'),
        'end_date' => now()->addDays(5)->format('Y-m-d'),
        'status' => 'CURRENT',
        'owned_by' => $this->user->id,
    ]);

    $item1 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'state_id' => $this->state->id,
        'sequence_id' => 3,
        'title' => 'Tarea Inicial',
        'created_by' => $this->user->id,
        'estimate_points' => 5,
    ]);

    $item2 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'state_id' => $this->state->id,
        'sequence_id' => 4,
        'title' => 'Tarea Agregada Despues',
        'created_by' => $this->user->id,
        'estimate_points' => 3,
    ]);

    $cycle->workItems()->attach([$item1->id, $item2->id]);

    DB::table('cycle_work_items')->where('work_item_id', $item1->id)->update([
        'created_at' => now()->subDays(6),
    ]);
    DB::table('cycle_work_items')->where('work_item_id', $item2->id)->update([
        'created_at' => now()->subDays(2),
    ]);

    $response = $this->actingAs($this->user)
        ->getJson("/api/v1/cycles/{$cycle->id}/analytics");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'cycle_id',
                'name',
                'status',
                'metrics',
                'breakdown',
                'scope_breakdown' => [
                    'initial_planned_count',
                    'added_mid_cycle_count',
                    'modified_count',
                    'unresolved_count',
                    'completed_count',
                ],
                'impact_analysis' => [
                    'scope_impact',
                    'ideal_impact',
                    'burndown_impact',
                    'burnup_impact',
                ],
                'timeline' => [
                    'dates',
                    'work_items',
                    'estimates',
                ],
                'work_items',
            ],
        ]);

    expect($response->json('data.scope_breakdown.initial_planned_count'))->toBe(1)
        ->and($response->json('data.scope_breakdown.added_mid_cycle_count'))->toBe(1);
});
