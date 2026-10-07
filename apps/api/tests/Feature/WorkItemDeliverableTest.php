<?php

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemDeliverable;
use App\Models\WorkItemDodItem;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create(['name' => 'John Developer']);
    $this->reviewer = User::factory()->create(['name' => 'Jane ProductOwner']);

    $this->workspace = Workspace::create([
        'name' => 'SDI Workspace',
        'slug' => 'sdi-ws',
        'owner_id' => $this->user->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'MEMBER',
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->reviewer->id,
        'role' => 'ADMIN',
    ]);

    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Core Banking',
        'identifier' => 'BNK',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->user->id,
        'role' => 'MEMBER',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->reviewer->id,
        'role' => 'ADMIN',
    ]);

    $this->state = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress',
        'group' => 'STARTED',
        'sequence' => 1,
    ]);

    $this->workItem = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'sequence_id' => 101,
        'title' => 'Implementar módulo de transferencias SPEI',
        'state_id' => $this->state->id,
        'created_by' => $this->user->id,
    ]);
});

it('lists deliverables and dod items for a work item', function () {
    WorkItemDeliverable::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'work_item_id' => $this->workItem->id,
        'created_by' => $this->user->id,
        'title' => 'Staging Preview URL',
        'type' => 'PREVIEW_URL',
        'url' => 'https://staging.bank.com/spei',
        'status' => 'PENDING_REVIEW',
    ]);

    WorkItemDodItem::create([
        'work_item_id' => $this->workItem->id,
        'title' => 'Pruebas unitarias al 90%',
        'is_completed' => true,
        'completed_by' => $this->user->id,
        'completed_at' => now(),
    ]);

    $res = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->getJson("/api/v1/projects/{$this->project->id}/work-items/{$this->workItem->id}/deliverables");

    $res->assertStatus(200);
    $res->assertJsonCount(1, 'data.deliverables');
    $res->assertJsonCount(1, 'data.dod_items');
    expect($res->json('data.deliverables.0.attributes.title'))->toBe('Staging Preview URL');
    expect($res->json('data.dod_items.0.attributes.title'))->toBe('Pruebas unitarias al 90%');
});

it('creates a link deliverable successfully', function () {
    $payload = [
        'title' => 'Pull Request de Backend',
        'type' => 'PULL_REQUEST',
        'url' => 'https://github.com/org/repo/pull/42',
        'description' => 'Contiene la lógica de comunicación con el switch bancario.',
    ];

    $res = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson("/api/v1/projects/{$this->project->id}/work-items/{$this->workItem->id}/deliverables", $payload);

    $res->assertStatus(201);
    expect($res->json('data.attributes.title'))->toBe('Pull Request de Backend');
    expect($res->json('data.attributes.type'))->toBe('PULL_REQUEST');
    expect($res->json('data.attributes.status'))->toBe('PENDING_REVIEW');
    expect($res->json('data.attributes.created_by'))->toBe($this->user->id);

    $this->assertDatabaseHas('work_item_deliverables', [
        'work_item_id' => $this->workItem->id,
        'title' => 'Pull Request de Backend',
    ]);
});

it('uploads and creates a file deliverable successfully using configured filesystem', function () {
    $disk = config('filesystems.default');
    Storage::fake($disk);

    $file = UploadedFile::fake()->create('evidencia_qa.pdf', 1024, 'application/pdf');

    $res = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson("/api/v1/projects/{$this->project->id}/work-items/{$this->workItem->id}/deliverables", [
            'title' => 'Certificación de Pruebas QA',
            'type' => 'QA_EVIDENCE',
            'file' => $file,
            'description' => 'Reporte con 15 casos de prueba ejecutados satisfactoriamente.',
        ]);

    $res->assertStatus(201);
    expect($res->json('data.attributes.file_name'))->toBe('evidencia_qa.pdf');
    expect($res->json('data.attributes.type'))->toBe('QA_EVIDENCE');
    expect($res->json('data.attributes.file_path'))->not->toBeNull();
    expect($res->json('data.attributes.disk'))->toBe($disk);
    expect($res->json('data.attributes.file_url'))->not->toBeNull();

    Storage::disk($disk)->assertExists($res->json('data.attributes.file_path'));
});

it('downloads a file deliverable successfully via streaming endpoint', function () {
    $disk = config('filesystems.default');
    Storage::fake($disk);
    $path = "projects/{$this->project->id}/deliverables/reporte.pdf";
    Storage::disk($disk)->put($path, 'Contenido binario del reporte');

    $deliverable = WorkItemDeliverable::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'work_item_id' => $this->workItem->id,
        'created_by' => $this->user->id,
        'title' => 'Reporte QA',
        'type' => 'QA_EVIDENCE',
        'disk' => $disk,
        'file_path' => $path,
        'file_name' => 'reporte.pdf',
        'status' => 'APPROVED',
    ]);

    $res = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->get("/api/v1/projects/{$this->project->id}/work-items/{$this->workItem->id}/deliverables/{$deliverable->id}/download");

    $res->assertStatus(200);
    $res->assertHeader('content-disposition', 'attachment; filename=reporte.pdf');
});

it('allows reviewing and approving a deliverable', function () {
    $deliverable = WorkItemDeliverable::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'work_item_id' => $this->workItem->id,
        'created_by' => $this->user->id,
        'title' => 'Figma Prototype',
        'type' => 'DESIGN',
        'url' => 'https://figma.com/file/12345',
        'status' => 'PENDING_REVIEW',
    ]);

    $res = $this->actingAs($this->reviewer)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->patchJson("/api/v1/projects/{$this->project->id}/work-items/{$this->workItem->id}/deliverables/{$deliverable->id}/review", [
            'status' => 'APPROVED',
            'review_notes' => 'Diseño verificado y conforme a las guías de estilo.',
        ]);

    $res->assertStatus(200);
    expect($res->json('data.attributes.status'))->toBe('APPROVED');
    expect($res->json('data.attributes.reviewed_by'))->toBe($this->reviewer->id);
    expect($res->json('data.attributes.review_notes'))->toBe('Diseño verificado y conforme a las guías de estilo.');
});

it('allows creator to delete their deliverable and cleans up storage', function () {
    $disk = config('filesystems.default');
    Storage::fake($disk);
    $path = 'projects/test/demo.pdf';
    Storage::disk($disk)->put($path, 'dummy content');

    $deliverable = WorkItemDeliverable::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'work_item_id' => $this->workItem->id,
        'created_by' => $this->user->id,
        'title' => 'Manual de Integración',
        'type' => 'DOCUMENT',
        'disk' => $disk,
        'file_path' => $path,
        'file_name' => 'demo.pdf',
        'status' => 'PENDING_REVIEW',
    ]);

    $res = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->deleteJson("/api/v1/projects/{$this->project->id}/work-items/{$this->workItem->id}/deliverables/{$deliverable->id}");

    $res->assertStatus(200);
    $this->assertDatabaseMissing('work_item_deliverables', ['id' => $deliverable->id]);
    Storage::disk($disk)->assertMissing($path);
});

it('manages dod items: create, toggle and delete', function () {
    // 1. Create
    $createRes = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->postJson("/api/v1/projects/{$this->project->id}/work-items/{$this->workItem->id}/dod-items", [
            'title' => 'Desplegado en ambiente de Staging',
        ]);

    $createRes->assertStatus(201);
    $dodId = $createRes->json('data.id');
    expect($createRes->json('data.attributes.is_completed'))->toBeFalse();

    // 2. Toggle to completed
    $toggleRes = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->patchJson("/api/v1/projects/{$this->project->id}/work-items/{$this->workItem->id}/dod-items/{$dodId}");

    $toggleRes->assertStatus(200);
    expect($toggleRes->json('data.attributes.is_completed'))->toBeTrue();
    expect($toggleRes->json('data.attributes.completed_by'))->toBe($this->user->id);

    // 3. Delete
    $deleteRes = $this->actingAs($this->user)
        ->withHeaders(['X-Workspace-Id' => $this->workspace->id])
        ->deleteJson("/api/v1/projects/{$this->project->id}/work-items/{$this->workItem->id}/dod-items/{$dodId}");

    $deleteRes->assertStatus(200);
    $this->assertDatabaseMissing('work_item_dod_items', ['id' => $dodId]);
});
