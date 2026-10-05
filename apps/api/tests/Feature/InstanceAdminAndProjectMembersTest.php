<?php

use App\Mail\ProjectInvitationMail;
use App\Mail\ProjectMemberAddedMail;
use App\Models\InstanceSetting;
use App\Models\Milestone;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Jobs\SendNotificationEmailJob;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;


beforeEach(function () {
    $this->superAdmin = User::factory()->create([
        'is_instance_admin' => true,
        'email' => 'admin@plane.local',
    ]);
    $this->adminToken = $this->superAdmin->createToken('admin-token')->plainTextToken;

    $this->regularUser = User::factory()->create([
        'is_instance_admin' => false,
        'email' => 'regular@plane.local',
    ]);
    $this->userToken = $this->regularUser->createToken('user-token')->plainTextToken;

    $this->workspace = Workspace::create([
        'name' => 'Plane Main Org',
        'slug' => 'plane-main-org',
        'owner_id' => $this->superAdmin->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->superAdmin->id,
        'role' => 'ADMIN',
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->regularUser->id,
        'role' => 'MEMBER',
    ]);

    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Core Engine',
        'identifier' => 'ENG',
        'estimate_system' => 'NONE',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->superAdmin->id,
        'role' => 'ADMIN',
    ]);

    \App\Models\State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'group' => 'BACKLOG',
        'color' => '#8C8C8C',
        'sequence' => 10,
        'is_default' => true,
    ]);
});

it('allows superadmin to retrieve and update instance settings', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
    ])->getJson('/api/v1/instance-admin/settings');

    $response->assertOk()
        ->assertJsonPath('data.allow_signups', true);

    $updateResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
    ])->putJson('/api/v1/instance-admin/settings', [
        'instance_name' => 'Plane Enterprise Test',
        'allow_signups' => false,
        'max_upload_size_mb' => 100,
    ]);

    $updateResp->assertOk()
        ->assertJsonPath('data.instance_name', 'Plane Enterprise Test')
        ->assertJsonPath('data.allow_signups', false)
        ->assertJsonPath('data.max_upload_size_mb', 100);

    expect(InstanceSetting::first()->instance_name)->toBe('Plane Enterprise Test');
});

it('forbids non instance admin from instance admin endpoints', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->userToken}",
    ])->getJson('/api/v1/instance-admin/settings');

    $response->assertForbidden();

    $healthResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->userToken}",
    ])->getJson('/api/v1/instance-admin/health');

    $healthResp->assertForbidden();
});

it('allows instance admin to view system health', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
    ])->getJson('/api/v1/instance-admin/health');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                'status',
                'components' => ['database', 'cache', 'storage'],
                'system' => ['php_version', 'laravel_version'],
                'statistics' => ['users_count', 'workspaces_count', 'projects_count', 'work_items_count'],
            ],
        ]);
});

it('persists project estimate system on update', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->putJson("/api/v1/projects/{$this->project->id}", [
        'name' => 'Updated Project Name',
        'estimate_system' => 'FIBONACCI',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.attributes.estimate_system', 'FIBONACCI');

    expect($this->project->fresh()->estimate_system)->toBe('FIBONACCI');
});

it('can add existing user to project and sends mail plus in-app notification', function () {
    Queue::fake();

    $newUser = User::factory()->create(['email' => 'colleague@example.com']);

    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/members", [
        'email' => 'colleague@example.com',
        'role' => 'MEMBER',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.type', 'MEMBER_ADDED');

    expect(ProjectMember::where('project_id', $this->project->id)->where('user_id', $newUser->id)->exists())->toBeTrue();

    // Verifica que se haya despachado el job de correo notificando que fue añadido
    Queue::assertPushed(SendNotificationEmailJob::class);

    // Verifica que se haya registrado notificación in-app
    expect(Notification::where('recipient_id', $newUser->id)
        ->where('type', 'PROJECT_INVITATION')
        ->where('entity_id', $this->project->id)
        ->exists())->toBeTrue();
});

it('creates invitation with token for unregistered email and allows acceptance', function () {
    Queue::fake();

    $inviteEmail = 'external_freelancer@test.org';

    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/members", [
        'email' => $inviteEmail,
        'role' => 'VIEWER',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.type', 'INVITATION_SENT')
        ->assertJsonPath('data.invitation.email', $inviteEmail);

    Queue::assertPushed(SendNotificationEmailJob::class);

    $token = $response->json('data.invitation.token');
    expect($token)->not->toBeEmpty();

    // Ver datos públicos de la invitación sin estar autenticado
    $publicResp = $this->getJson("/api/v1/invitations/{$token}");
    $publicResp->assertOk()
        ->assertJsonPath('data.email', $inviteEmail)
        ->assertJsonPath('data.user_exists', false)
        ->assertJsonPath('data.project.id', (string) $this->project->id);

    // Usuario recién registrado acepta la invitación
    $acceptUser = User::factory()->create(['email' => $inviteEmail]);

    $acceptResp = $this->actingAs($acceptUser)
        ->postJson("/api/v1/invitations/{$token}/accept");

    $acceptResp->assertOk();

    expect(ProjectMember::where('project_id', $this->project->id)->where('user_id', $acceptUser->id)->first()?->role)->toBe('VIEWER');

    // Notificación in-app de bienvenida al unirse
    expect(Notification::where('recipient_id', $acceptUser->id)
        ->where('type', 'PROJECT_INVITATION')
        ->exists())->toBeTrue();
});

it('allows unregistered user to complete onboarding and auto-accept invitation', function () {
    Mail::fake();

    $inviteEmail = 'onboarding_guest@test.org';

    // 1. Invitar al usuario no registrado
    $invResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/members", [
        'email' => $inviteEmail,
        'role' => 'MEMBER',
    ]);

    $token = $invResp->json('data.invitation.token');

    // 2. Ejecutar onboarding con creación de cuenta
    $onboardResp = $this->postJson("/api/v1/invitations/{$token}/onboard", [
        'name'     => 'Carlos Invitado',
        'password' => 'secretPassword123',
    ]);

    $onboardResp->assertStatus(201)
        ->assertJsonStructure(['token', 'user', 'current_workspace', 'data' => ['project']])
        ->assertJsonPath('user.email', $inviteEmail)
        ->assertJsonPath('user.name', 'Carlos Invitado')
        ->assertJsonPath('data.project.id', (string) $this->project->id);

    $createdUser = User::where('email', $inviteEmail)->first();
    expect($createdUser)->not->toBeNull();

    // 3. Verificar membresía creada en workspace y proyecto
    expect(WorkspaceMember::where('workspace_id', $this->workspace->id)->where('user_id', $createdUser->id)->exists())->toBeTrue();
    expect(ProjectMember::where('project_id', $this->project->id)->where('user_id', $createdUser->id)->first()?->role)->toBe('MEMBER');

    // 4. Verificar notificación in-app de bienvenida creada
    expect(Notification::where('recipient_id', $createdUser->id)
        ->where('type', 'PROJECT_INVITATION')
        ->exists())->toBeTrue();
});

it('allows superadmin to test SMTP email configuration', function () {
    Mail::fake();

    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
    ])->postJson('/api/v1/instance-admin/test-email', [
        'email' => 'smtp_target@example.org',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true);
});

it('allows work item to assign lead and milestone', function () {
    $milestone = Milestone::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'title' => 'Alpha 1 Milestone',
        'status' => 'OPEN',
    ]);

    $createResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/work-items", [
        'title' => 'Work Item With Milestone and Lead',
        'lead_id' => $this->superAdmin->id,
        'milestone_id' => $milestone->id,
        'priority' => 'HIGH',
    ]);

    $createResp->assertStatus(201);
    $workItemId = $createResp->json('data.id');

    expect(WorkItem::find($workItemId)->milestone_id)->toBe($milestone->id);
    expect(WorkItem::find($workItemId)->lead_id)->toBe($this->superAdmin->id);

    // Consultar el work item y verificar atributos y relaciones
    $getResp = $this->withHeaders([
        'Authorization' => "Bearer {$this->adminToken}",
        'X-Workspace-Id' => $this->workspace->id,
    ])->getJson("/api/v1/work-items/{$workItemId}");

    $getResp->assertOk()
        ->assertJsonPath('data.attributes.lead_id', $this->superAdmin->id)
        ->assertJsonPath('data.relationships.milestone.data.id', (string) $milestone->id);
});

it('runs database seeder successfully', function () {
    $this->seed(DatabaseSeeder::class);

    expect(User::where('email', 'admin@plane.local')->first()?->is_instance_admin)->toBeTrue();
    expect(User::where('email', 'admin@example.com')->exists())->toBeTrue();
    $coreWorkspace = Workspace::where('slug', 'plane-core')->first();
    expect(Project::where('identifier', 'ENG')->where('workspace_id', $coreWorkspace->id)->first()?->estimate_system)->toBe('FIBONACCI');
    expect(InstanceSetting::first()?->instance_name)->toBe('Plane Self-Hosted Engine');
});
