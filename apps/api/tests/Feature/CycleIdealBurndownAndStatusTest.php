<?php

use App\Models\Cycle;
use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::create([
        'name' => 'Test Workspace',
        'slug' => 'test-ws-'.uniqid(),
        'owner_id' => $this->user->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'OWNER',
    ]);

    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Project Alpha',
        'identifier' => 'ALP',
    ]);

    $this->backlogState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'color' => '#94a3b8',
        'group' => 'BACKLOG',
        'sequence' => 1,
    ]);

    $this->inProgressState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress',
        'color' => '#f59e0b',
        'group' => 'STARTED',
        'sequence' => 2,
    ]);

    $this->doneState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'color' => '#10b981',
        'group' => 'COMPLETED',
        'sequence' => 3,
    ]);
});

test('it rejects creating a cycle that overlaps with an existing CURRENT cycle returning HTTP 422', function () {
    // 1. Ciclo actual activo
    Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1 - Activo',
        'start_date' => now()->subDays(3)->format('Y-m-d'),
        'end_date' => now()->addDays(5)->format('Y-m-d'),
        'status' => 'CURRENT',
    ]);

    // 2. Intentar crear un nuevo ciclo cuyas fechas se solapan con el ciclo actual
    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->postJson("/api/v1/projects/{$this->project->id}/cycles", [
            'name' => 'Sprint 2 - Solapado',
            'start_date' => now()->addDays(2)->format('Y-m-d'),
            'end_date' => now()->addDays(12)->format('Y-m-d'),
        ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['start_date']);
    expect($response->json('errors.start_date.0'))->toContain('se solapan con el ciclo actual');
});

test('it rejects editing a cycle to dates that overlap with the CURRENT cycle returning HTTP 422', function () {
    // 1. Ciclo actual activo
    $currentCycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1 - Actual',
        'start_date' => now()->subDays(2)->format('Y-m-d'),
        'end_date' => now()->addDays(4)->format('Y-m-d'),
        'status' => 'CURRENT',
    ]);

    // 2. Ciclo futuro programado
    $upcomingCycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 2 - Futuro',
        'start_date' => now()->addDays(10)->format('Y-m-d'),
        'end_date' => now()->addDays(20)->format('Y-m-d'),
        'status' => 'UPCOMING',
    ]);

    // 3. Modificar Sprint 2 para que empiece dentro del rango de Sprint 1
    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->putJson("/api/v1/cycles/{$upcomingCycle->id}", [
            'start_date' => now()->addDays(3)->format('Y-m-d'),
            'end_date' => now()->addDays(15)->format('Y-m-d'),
        ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['start_date']);
    expect($response->json('errors.start_date.0'))->toContain('se solapan con el ciclo actual');
});

test('it allows updating the CURRENT cycle itself without self-overlap validation error', function () {
    $currentCycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1 - En marcha',
        'start_date' => now()->subDays(2)->format('Y-m-d'),
        'end_date' => now()->addDays(4)->format('Y-m-d'),
        'status' => 'CURRENT',
    ]);

    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->putJson("/api/v1/cycles/{$currentCycle->id}", [
            'name' => 'Sprint 1 - Nombre Actualizado',
            'end_date' => now()->addDays(6)->format('Y-m-d'),
        ]);

    $response->assertStatus(200);
    $response->assertJsonPath('data.attributes.name', 'Sprint 1 - Nombre Actualizado');
    expect($currentCycle->fresh()->end_date->format('Y-m-d'))->toBe(now()->addDays(6)->format('Y-m-d'));
});

test('it automatically sets and transitions cycle statuses according to date ranges', function () {
    // 1. Ciclo futuro -> UPCOMING
    $upcoming = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint Futuro',
        'start_date' => now()->addDays(5)->format('Y-m-d'),
        'end_date' => now()->addDays(15)->format('Y-m-d'),
        'status' => 'UPCOMING',
    ]);

    // 2. Ciclo vencido que aún figuraba como CURRENT -> debe pasar a COMPLETED
    $expired = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint Expirado',
        'start_date' => now()->subDays(20)->format('Y-m-d'),
        'end_date' => now()->subDays(5)->format('Y-m-d'),
        'status' => 'CURRENT',
    ]);

    // 3. Ciclo que ahora abarca la fecha actual pero estaba en UPCOMING -> debe pasar a CURRENT
    $nowActive = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint Ahora Activo',
        'start_date' => now()->subDays(2)->format('Y-m-d'),
        'end_date' => now()->addDays(3)->format('Y-m-d'),
        'status' => 'UPCOMING',
    ]);

    // Listar ciclos a través de la API (dispara la sincronización)
    $response = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson("/api/v1/projects/{$this->project->id}/cycles");

    $response->assertStatus(200);

    // Verificar en la BD las transiciones automáticas
    expect($expired->fresh()->status)->toBe('COMPLETED');
    expect($nowActive->fresh()->status)->toBe('CURRENT');
    expect($upcoming->fresh()->status)->toBe('UPCOMING');
});

test('it dynamically recalculates ideal burndown day by day as work items are added mid-cycle', function () {
    $startDate = now()->subDays(4)->startOfDay();
    $endDate = now()->addDays(5)->endOfDay(); // 10 días en total (días 0 al 9)

    $cycle = Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint Mid-Cycle Recalculation',
        'start_date' => $startDate->format('Y-m-d'),
        'end_date' => $endDate->format('Y-m-d'),
        'status' => 'CURRENT',
    ]);

    // 2 Tareas creadas el día de inicio
    $item1 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 101,
        'title' => 'Initial Task 1',
        'state_id' => $this->inProgressState->id,
        'created_by' => $this->user->id,
        'estimate_points' => 3,
        'created_at' => $startDate,
    ]);

    $item2 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 102,
        'title' => 'Initial Task 2',
        'state_id' => $this->inProgressState->id,
        'created_by' => $this->user->id,
        'estimate_points' => 5,
        'created_at' => $startDate,
    ]);

    DB::table('cycle_work_items')->insert([
        ['cycle_id' => $cycle->id, 'work_item_id' => $item1->id, 'created_at' => $startDate, 'updated_at' => $startDate],
        ['cycle_id' => $cycle->id, 'work_item_id' => $item2->id, 'created_at' => $startDate, 'updated_at' => $startDate],
    ]);

    // 2 Tareas adicionales incorporadas a mitad del ciclo (hoy)
    $item3 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 103,
        'title' => 'Mid-Cycle Added Task 3',
        'state_id' => $this->backlogState->id,
        'created_by' => $this->user->id,
        'estimate_points' => 4,
        'created_at' => now(),
    ]);

    $item4 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 104,
        'title' => 'Mid-Cycle Added Task 4',
        'state_id' => $this->backlogState->id,
        'created_by' => $this->user->id,
        'estimate_points' => 2,
        'created_at' => now(),
    ]);

    DB::table('cycle_work_items')->insert([
        ['cycle_id' => $cycle->id, 'work_item_id' => $item3->id, 'created_at' => now(), 'updated_at' => now()],
        ['cycle_id' => $cycle->id, 'work_item_id' => $item4->id, 'created_at' => now(), 'updated_at' => now()],
    ]);

    $analytics = $this->actingAs($this->user)
        ->withHeader('X-Workspace-Id', (string) $this->workspace->id)
        ->getJson("/api/v1/cycles/{$cycle->id}/analytics");

    $analytics->assertStatus(200);

    $timelineItems = $analytics->json('data.timeline.work_items');
    $totalDays = count($timelineItems) - 1;
    expect($totalDays)->toBe(9);

    // Día 0 (inicio): solo estaban las 2 tareas iniciales
    expect($timelineItems[0]['scope'])->toBe(2);
    expect((float) $timelineItems[0]['ideal_pending'])->toEqual(2.0);

    // Día 4 (hoy): se sumaron las 2 tareas mid-cycle -> scope es 4
    expect($timelineItems[4]['scope'])->toBe(4);
    // Ideal pending en el día 4 recalculado con scope 4: 4 * (1 - 4/9) = 4 * 5/9 = 2.2
    expect((float) $timelineItems[4]['ideal_pending'])->toEqual(2.2);

    // Último día (día 9): ideal_pending siempre concluye en 0.0
    expect((float) $timelineItems[$totalDays]['ideal_pending'])->toEqual(0.0);
    expect((float) $timelineItems[$totalDays]['ideal_completed'])->toEqual(4.0);
});

test('it executes cycles:sync-ideal artisan command updating projects cleanly', function () {
    Cycle::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint Artisan Test',
        'start_date' => now()->subDays(1)->format('Y-m-d'),
        'end_date' => now()->addDays(5)->format('Y-m-d'),
        'status' => 'CURRENT',
    ]);

    $exitCode = Artisan::call('cycles:sync-ideal', [
        '--project' => $this->project->id,
    ]);

    expect($exitCode)->toBe(0);
});
