<?php

use App\Models\Page;
use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::create([
        'name' => 'Acme Workspace',
        'slug' => 'acme-ws',
        'owner_id' => $this->user->id,
    ]);
    $this->workspace->members()->attach($this->user->id, ['role' => 'admin']);
    $this->user->update(['current_workspace_id' => $this->workspace->id]);
});

test('it creates and lists pages for a workspace', function () {
    $response = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson('/api/v1/pages', [
            'title' => 'Documento de Arquitectura',
            'content_json' => [
                ['id' => 'b1', 'type' => 'heading_1', 'content' => 'Diseño Técnico'],
                ['id' => 'b2', 'type' => 'paragraph', 'content' => 'Este documento describe el backend y frontend.'],
            ],
            'is_published' => true,
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.title', 'Documento de Arquitectura')
        ->assertJsonPath('data.attributes.is_published', true)
        ->assertJsonCount(2, 'data.attributes.content_json');

    $listResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->getJson('/api/v1/pages');

    $listResponse->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

test('it builds hierarchical tree of wiki pages (parent and children)', function () {
    $rootPage = Page::create([
        'workspace_id' => $this->workspace->id,
        'title' => 'Wiki Raíz',
        'content_json' => [['id' => 'b1', 'type' => 'paragraph', 'content' => 'Raíz']],
        'order' => 1,
        'created_by' => $this->user->id,
    ]);

    $childPage = Page::create([
        'workspace_id' => $this->workspace->id,
        'parent_id' => $rootPage->id,
        'title' => 'Subpágina Wiki 1',
        'content_json' => [['id' => 'b2', 'type' => 'paragraph', 'content' => 'Hijo']],
        'order' => 1,
        'created_by' => $this->user->id,
    ]);

    $treeResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->getJson('/api/v1/pages/tree');

    $treeResponse->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Wiki Raíz')
        ->assertJsonPath('data.0.children.0.title', 'Subpágina Wiki 1');
});

test('it updates page content and enforces lock protection', function () {
    $page = Page::create([
        'workspace_id' => $this->workspace->id,
        'title' => 'Manual de Usuario',
        'content_json' => [['id' => 'b1', 'type' => 'paragraph', 'content' => 'Versión preliminar']],
        'is_locked' => false,
        'created_by' => $this->user->id,
    ]);

    // Update content normally
    $updateResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->putJson("/api/v1/pages/{$page->id}", [
            'title' => 'Manual de Usuario Final',
            'content_json' => [['id' => 'b1', 'type' => 'paragraph', 'content' => 'Contenido completo']],
            'is_locked' => true,
        ]);

    $updateResponse->assertStatus(200)
        ->assertJsonPath('data.attributes.title', 'Manual de Usuario Final')
        ->assertJsonPath('data.attributes.is_locked', true);

    // Try to update locked page
    $lockedAttempt = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->putJson("/api/v1/pages/{$page->id}", [
            'content_json' => [['id' => 'b2', 'type' => 'paragraph', 'content' => 'Cambio no autorizado']],
        ]);

    $lockedAttempt->assertStatus(423);
});

test('it tracks page views and calculates page analytics', function () {
    $page = Page::create([
        'workspace_id' => $this->workspace->id,
        'title' => 'Página con Analíticas',
        'content_json' => [
            ['id' => 'b1', 'type' => 'heading_1', 'content' => 'Título de prueba'],
            ['id' => 'b2', 'type' => 'paragraph', 'content' => 'Esta es una descripción detallada que contiene varias palabras para probar el cálculo exacto del tiempo de lectura y analíticas.'],
        ],
        'created_by' => $this->user->id,
    ]);

    // Record view
    $viewResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson("/api/v1/pages/{$page->id}/view");

    $viewResponse->assertStatus(200)
        ->assertJsonPath('views_count', 1);

    // Fetch analytics
    $analyticsResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->getJson("/api/v1/pages/{$page->id}/analytics");

    $analyticsResponse->assertStatus(200)
        ->assertJsonPath('data.attributes.total_views', 1)
        ->assertJsonPath('data.attributes.unique_viewers', 1)
        ->assertJsonPath('data.attributes.block_count', 2)
        ->assertJsonPath('data.attributes.reading_time_minutes', 1);
});

test('it generates a dynamic report page from project work items', function () {
    $project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'App Móvil',
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

    $startedState = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $project->id,
        'name' => 'In Progress',
        'color' => '#3b82f6',
        'group' => 'STARTED',
        'sequence' => 2,
    ]);

    // Create work items
    WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $project->id,
        'state_id' => $completedState->id,
        'title' => 'Login con Biometría',
        'sequence_id' => 1,
        'priority' => 'HIGH',
        'created_by' => $this->user->id,
    ]);

    WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $project->id,
        'state_id' => $startedState->id,
        'title' => 'Notificaciones Push',
        'sequence_id' => 2,
        'priority' => 'URGENT',
        'created_by' => $this->user->id,
    ]);

    $reportResponse = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson('/api/v1/pages/generate-report', [
            'project_id' => $project->id,
        ]);

    $reportResponse->assertStatus(201)
        ->assertJsonPath('data.attributes.is_published', true);

    $page = Page::find($reportResponse->json('data.id'));
    expect($page->content_json)->not->toBeEmpty();
    expect($page->title)->toContain('Reporte de Estado — App Móvil');
});
