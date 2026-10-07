<?php

use App\Models\Cycle;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemType;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create(['name' => 'John Doe']);
    $this->colleague = User::factory()->create(['name' => 'Jane Smith']);

    $this->workspace = Workspace::create([
        'name' => 'KPI Workspace',
        'slug' => 'kpi-ws',
        'owner_id' => $this->user->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'OWNER',
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->colleague->id,
        'role' => 'MEMBER',
    ]);

    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Analytics Core',
        'identifier' => 'ANC',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->user->id,
        'role' => 'ADMIN',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->colleague->id,
        'role' => 'MEMBER',
    ]);

    $this->startedState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress',
        'color' => '#f59e0b',
        'group' => 'STARTED',
        'sequence' => 2,
    ]);

    $this->completedState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'color' => '#10b981',
        'group' => 'COMPLETED',
        'sequence' => 3,
    ]);

    $this->bugType = WorkItemType::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Bug',
        'icon' => 'bug',
        'color' => '#ef4444',
    ]);

    $this->featureType = WorkItemType::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Feature',
        'icon' => 'star',
        'color' => '#3b82f6',
    ]);
});

test('it retrieves project kpi overview correctly', function () {
    // 1 item en progreso
    $item1 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'created_by' => $this->user->id,
        'title' => 'Feature in progress',
        'state_id' => $this->startedState->id,
        'type_id' => $this->featureType->id,
        'estimate_points' => 5,
        'start_date' => Carbon::now()->subDays(2),
    ]);
    $item1->assignees()->attach($this->colleague->id);

    // 1 item completado a tiempo
    $item2 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 2,
        'created_by' => $this->user->id,
        'title' => 'Completed feature',
        'state_id' => $this->completedState->id,
        'type_id' => $this->featureType->id,
        'estimate_points' => 8,
        'start_date' => Carbon::now()->subDays(5),
        'target_date' => Carbon::now()->addDays(2),
        'completed_at' => Carbon::now()->subDay(),
    ]);
    $item2->assignees()->attach($this->colleague->id);

    // 1 bug completado
    $item3 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 3,
        'created_by' => $this->user->id,
        'title' => 'Critical bug resolved',
        'state_id' => $this->completedState->id,
        'type_id' => $this->bugType->id,
        'estimate_points' => 3,
        'start_date' => Carbon::now()->subDays(3),
        'target_date' => Carbon::now()->subDays(1),
        'completed_at' => Carbon::now()->subHours(10), // Atrasado
    ]);
    $item3->assignees()->attach($this->user->id);

    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/analytics/overview");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'summary' => [
                    'total_items',
                    'completed_items',
                    'in_progress_wip',
                    'completion_percentage',
                    'total_estimate_points',
                    'completed_estimate_points',
                    'health_status',
                ],
                'speed_and_throughput' => [
                    'velocity_14d_items',
                    'velocity_14d_points',
                    'throughput_period_items',
                    'avg_cycle_time_days',
                    'p85_cycle_time_days',
                    'avg_lead_time_days',
                ],
                'delivery_and_quality' => [
                    'on_time_delivery_rate',
                    'defect_density_rate',
                    'total_bugs',
                    'resolved_bugs',
                ],
            ],
        ]);

    $data = $response->json('data');
    expect($data['summary']['total_items'])->toBe(3);
    expect($data['summary']['completed_items'])->toBe(2);
    expect($data['summary']['in_progress_wip'])->toBe(1);
    expect($data['delivery_and_quality']['total_bugs'])->toBe(1);
    expect($data['delivery_and_quality']['resolved_bugs'])->toBe(1);
});

test('it retrieves cycle velocity trend', function () {
    $cycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1',
        'status' => 'COMPLETED',
        'start_date' => Carbon::now()->subDays(14),
        'end_date' => Carbon::now()->subDays(1),
    ]);

    $item = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'created_by' => $this->user->id,
        'title' => 'Sprint task',
        'state_id' => $this->completedState->id,
        'estimate_points' => 13,
        'completed_at' => Carbon::now()->subDays(2),
    ]);
    $cycle->workItems()->attach($item->id);

    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/analytics/velocity");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'cycle_id',
                    'cycle_name',
                    'status',
                    'committed_points',
                    'completed_points',
                ],
            ],
        ]);

    $cyclesData = $response->json('data');
    expect(count($cyclesData))->toBe(1);
    expect($cyclesData[0]['completed_points'])->toEqual(13);
});

test('it calculates cycle time distribution and percentiles', function () {
    WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'created_by' => $this->user->id,
        'title' => 'Task A',
        'state_id' => $this->completedState->id,
        'start_date' => Carbon::now()->subDays(4),
        'completed_at' => Carbon::now()->subDays(1),
    ]);

    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/analytics/cycle-time");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'percentiles' => [
                    'p50',
                    'p85',
                    'p95',
                    'average',
                    'total_completed_analyzed',
                ],
                'histogram_buckets',
                'scatter_samples',
            ],
        ]);
});

test('it evaluates members performance matrix', function () {
    $item = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'created_by' => $this->user->id,
        'title' => 'Jane assigned item',
        'state_id' => $this->startedState->id,
        'estimate_points' => 3,
    ]);
    $item->assignees()->attach($this->colleague->id);

    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/analytics/members");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'user_id',
                    'name',
                    'email',
                    'project_role',
                    'assigned_total',
                    'active_wip',
                    'load_status',
                ],
            ],
        ]);

    $members = $response->json('data');
    $jane = collect($members)->firstWhere('user_id', $this->colleague->id);
    expect($jane)->not->toBeNull();
    expect($jane['assigned_total'])->toBe(1);
    expect($jane['active_wip'])->toBe(1);
    expect($jane['load_status'])->toBe('optimal');
});

test('it retrieves individual member performance detail', function () {
    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/analytics/members/{$this->colleague->id}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'member' => ['id', 'name', 'email'],
                'stats' => ['total_assigned', 'active_wip', 'completed_total'],
                'type_distribution',
                'weekly_throughput',
                'active_items',
            ],
        ]);
});
