<?php

use App\Models\Project;
use App\Models\Release;
use App\Models\State;
use App\Models\Sticky;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemType;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::create([
        'name' => 'Acme Corp',
        'slug' => 'acme-corp',
        'owner_id' => $this->user->id,
    ]);
    $this->workspace->members()->attach($this->user->id, ['role' => 'admin']);
    $this->user->update(['current_workspace_id' => $this->workspace->id]);
});

test('it creates and lists initiatives with linked projects and progress metrics', function () {
    $project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Backend API',
        'identifier' => 'API',
    ]);

    $response = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson('/api/v1/initiatives', [
            'title' => 'Migración a Microservicios 2026',
            'description' => 'Estrategia de escalabilidad para el core',
            'target_date' => '2026-12-31',
            'status' => 'IN_PROGRESS',
            'project_ids' => [$project->id],
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.title', 'Migración a Microservicios 2026')
        ->assertJsonPath('data.attributes.status', 'IN_PROGRESS')
        ->assertJsonCount(1, 'data.relationships.projects');

    $listResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->getJson('/api/v1/initiatives');

    $listResponse->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

test('it creates and lists teamspaces with linked projects', function () {
    $project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Design System UI',
        'identifier' => 'DS',
    ]);

    $response = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson('/api/v1/teamspaces', [
            'name' => 'Frontend Platform',
            'description' => 'Equipo de desarrollo frontend y componentes',
            'icon' => '🎨',
            'project_ids' => [$project->id],
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'Frontend Platform')
        ->assertJsonPath('data.attributes.slug', 'frontend-platform')
        ->assertJsonCount(1, 'data.relationships.projects');
});

test('it creates project milestones and toggles completion', function () {
    $project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Billing System',
        'identifier' => 'BIL',
    ]);

    $response = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson("/api/v1/projects/{$project->id}/milestones", [
            'title' => 'Beta Pública de Facturación',
            'target_date' => '2026-10-15',
            'status' => 'PENDING',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.title', 'Beta Pública de Facturación')
        ->assertJsonPath('data.attributes.status', 'PENDING');

    $milestoneId = $response->json('data.id');

    // Toggle complete
    $toggleResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson("/api/v1/milestones/{$milestoneId}/complete");

    $toggleResponse->assertStatus(200)
        ->assertJsonPath('data.attributes.status', 'COMPLETED');
    expect($toggleResponse->json('data.attributes.completed_at'))->not->toBeNull();
});

test('it creates release and generates categorized changelog automatically (Option A)', function () {
    $project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Mobile App',
        'identifier' => 'MOB',
    ]);

    $completedState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $project->id,
        'name' => 'Done',
        'color' => '#10b981',
        'group' => 'COMPLETED',
        'sequence' => 1,
    ]);

    $featType = WorkItemType::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $project->id,
        'name' => 'Historia',
        'color' => '#6366f1',
    ]);

    $bugType = WorkItemType::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $project->id,
        'name' => 'Bug',
        'color' => '#ef4444',
    ]);

    $item1 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $project->id,
        'state_id' => $completedState->id,
        'type_id' => $featType->id,
        'title' => 'Soporte FaceID y huella dactilar',
        'sequence_id' => 1,
        'created_by' => $this->user->id,
    ]);

    $item2 = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $project->id,
        'state_id' => $completedState->id,
        'type_id' => $bugType->id,
        'title' => 'Corregir fuga de memoria en scroll de inicio',
        'sequence_id' => 2,
        'created_by' => $this->user->id,
    ]);

    // Create Release
    $response = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson("/api/v1/projects/{$project->id}/releases", [
            'name' => 'Versión Otoño 2026',
            'version' => 'v2.1.0',
            'work_item_ids' => [$item1->id, $item2->id],
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'Versión Otoño 2026')
        ->assertJsonPath('data.attributes.status', 'DRAFT');

    $changelog = $response->json('data.attributes.changelog');
    expect($changelog)->toContain('### 🚀 Nuevas Características');
    expect($changelog)->toContain('Soporte FaceID');
    expect($changelog)->toContain('### 🐛 Corrección de Errores');
    expect($changelog)->toContain('Corregir fuga de memoria');

    $releaseId = $response->json('data.id');

    // Publish Release
    $publishResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson("/api/v1/releases/{$releaseId}/publish");

    $publishResponse->assertStatus(200)
        ->assertJsonPath('data.attributes.status', 'PUBLISHED');
    expect($publishResponse->json('data.attributes.published_at'))->not->toBeNull();
});

test('it creates stickies with color, pin and enforces privacy isolation (Option A)', function () {
    $otherUser = User::factory()->create();
    $this->workspace->members()->attach($otherUser->id, ['role' => 'member']);
    $otherUser->update(['current_workspace_id' => $this->workspace->id]);

    // Create a public sticky note
    $publicSticky = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson('/api/v1/stickies', [
            'content' => 'Reunión de sprint planning los lunes 9am',
            'color' => 'yellow',
            'is_pinned' => true,
            'is_private' => false,
        ]);

    $publicSticky->assertStatus(201)
        ->assertJsonPath('data.attributes.is_pinned', true)
        ->assertJsonPath('data.attributes.is_private', false);

    // Create a private sticky note for this user
    $privateSticky = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson('/api/v1/stickies', [
            'content' => 'Mi contraseña temporal y notas personales',
            'color' => 'pink',
            'is_private' => true,
        ]);

    $privateSticky->assertStatus(201)
        ->assertJsonPath('data.attributes.is_private', true);

    // Other user lists stickies: can see public sticky, but CANNOT see private sticky
    $otherResponse = $this->actingAs($otherUser)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->getJson('/api/v1/stickies');

    $otherResponse->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.content', 'Reunión de sprint planning los lunes 9am');

    // Author lists stickies: sees both
    $authorResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->getJson('/api/v1/stickies');

    $authorResponse->assertStatus(200)
        ->assertJsonCount(2, 'data');
});
