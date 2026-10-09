<?php

use App\Mcp\Prompts\PlanSprintPrompt;
use App\Mcp\Prompts\ProjectHealthReviewPrompt;
use App\Mcp\Resources\ProjectListResource;
use App\Mcp\Resources\ProjectSummaryResource;
use App\Mcp\Servers\ProjectManagementServer;
use App\Mcp\Tools\Cycles\CreateCycleTool;
use App\Mcp\Tools\Cycles\ListCyclesTool;
use App\Mcp\Tools\Members\AddProjectMemberTool;
use App\Mcp\Tools\Members\ListProjectMembersTool;
use App\Mcp\Tools\Members\RemoveProjectMemberTool;
use App\Mcp\Tools\Members\UpdateProjectMemberRoleTool;
use App\Mcp\Tools\Milestones\CreateMilestoneTool;
use App\Mcp\Tools\Milestones\ListMilestonesTool;
use App\Mcp\Tools\Modules\CreateModuleTool;
use App\Mcp\Tools\Modules\ListModulesTool;
use App\Mcp\Tools\Projects\CreateProjectTool;
use App\Mcp\Tools\Projects\DeleteProjectTool;
use App\Mcp\Tools\Projects\GetProjectTool;
use App\Mcp\Tools\Projects\ListProjectsTool;
use App\Mcp\Tools\Projects\UpdateProjectTool;
use App\Mcp\Tools\Releases\CreateReleaseTool;
use App\Mcp\Tools\Releases\ListReleasesTool;
use App\Mcp\Tools\Workflow\ListProjectLabelsTool;
use App\Mcp\Tools\Workflow\ListProjectStatesTool;
use App\Mcp\Tools\WorkItems\CreateWorkItemTool;
use App\Mcp\Tools\WorkItems\DeleteWorkItemTool;
use App\Mcp\Tools\WorkItems\GetWorkItemTool;
use App\Mcp\Tools\WorkItems\ListWorkItemsTool;
use App\Mcp\Tools\WorkItems\UpdateWorkItemTool;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use App\Models\WorkspaceMember;

beforeEach(function () {
    $this->user = User::factory()->create([
        'is_instance_admin' => true,
    ]);
    $this->token = $this->user->createToken('mcp-test-token')->plainTextToken;

    $this->workspace = Workspace::create([
        'name' => 'MCP Workspace',
        'slug' => 'mcp-workspace',
        'owner_id' => $this->user->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'OWNER',
    ]);

    app()->instance('current_workspace_id', $this->workspace->id);
    app()->instance('current_workspace', $this->workspace);

    // Crear un proyecto de prueba base con estados estándar
    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Backend Engineering',
        'identifier' => 'ENG',
        'description' => 'Servicios centrales y APIs',
        'lead_id' => $this->user->id,
        'estimate_system' => 'POINTS',
    ]);

    $this->stateBacklog = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'group' => 'BACKLOG',
        'color' => '#808080',
        'sequence' => 1,
        'is_default' => true,
    ]);

    $this->stateDone = State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'group' => 'COMPLETED',
        'color' => '#00FF00',
        'sequence' => 2,
        'is_default' => false,
    ]);
});

it('discovers all registered tools, resources, and prompts on the MCP server', function () {
    $tools = ProjectManagementServer::tools();
    $tools->assertRegistered([
        ListProjectsTool::class,
        GetProjectTool::class,
        CreateProjectTool::class,
        UpdateProjectTool::class,
        DeleteProjectTool::class,
        ListWorkItemsTool::class,
        GetWorkItemTool::class,
        CreateWorkItemTool::class,
        UpdateWorkItemTool::class,
        DeleteWorkItemTool::class,
        ListCyclesTool::class,
        ListModulesTool::class,
        ListMilestonesTool::class,
        ListReleasesTool::class,
        ListProjectStatesTool::class,
        ListProjectLabelsTool::class,
        ListProjectMembersTool::class,
        AddProjectMemberTool::class,
        UpdateProjectMemberRoleTool::class,
        RemoveProjectMemberTool::class,
    ]);

    $resources = ProjectManagementServer::resources();
    $resources->assertRegistered([
        ProjectListResource::class,
    ]);

    $prompts = ProjectManagementServer::prompts();
    $prompts->assertRegistered([
        PlanSprintPrompt::class,
        ProjectHealthReviewPrompt::class,
    ]);
});

it('lists and gets projects using MCP tools', function () {
    $listResponse = ProjectManagementServer::tool(ListProjectsTool::class);
    $listResponse->assertOk()
        ->assertSee('ENG')
        ->assertSee('Backend Engineering');

    $getResponse = ProjectManagementServer::tool(GetProjectTool::class, [
        'project' => 'ENG',
    ]);
    $getResponse->assertOk()
        ->assertSee('ENG')
        ->assertSee('Backend Engineering');
});

it('creates and updates a project using MCP tools', function () {
    $createResponse = ProjectManagementServer::tool(CreateProjectTool::class, [
        'name' => 'Frontend Mobile App',
        'identifier' => 'MOB',
        'description' => 'Aplicación iOS y Android',
    ]);
    $createResponse->assertOk()
        ->assertSee('MOB')
        ->assertSee('Frontend Mobile App');

    $this->assertDatabaseHas('projects', ['identifier' => 'MOB']);

    $updateResponse = ProjectManagementServer::tool(UpdateProjectTool::class, [
        'project' => 'MOB',
        'name' => 'Mobile Next-Gen',
        'estimate_system' => 'TSHIRT',
    ]);
    $updateResponse->assertOk()
        ->assertSee('Mobile Next-Gen');

    $this->assertDatabaseHas('projects', [
        'identifier' => 'MOB',
        'name' => 'Mobile Next-Gen',
        'estimate_system' => 'TSHIRT',
    ]);
});

it('manages work items lifecycle via MCP tools', function () {
    // 1. Crear WorkItem
    $createResponse = ProjectManagementServer::tool(CreateWorkItemTool::class, [
        'project' => 'ENG',
        'title' => 'Diseñar arquitectura MCP',
        'description' => 'Definir protocolo stdio y web con Laravel MCP',
        'priority' => 'HIGH',
        'estimate_points' => 5,
    ]);

    $createResponse->assertOk()
        ->assertSee('ENG-1')
        ->assertSee('Diseñar arquitectura MCP');

    $this->assertDatabaseHas('work_items', [
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'priority' => 'HIGH',
    ]);

    // 2. Consultar WorkItem y verificar que description_html contiene HTML puro
    $getResponse = ProjectManagementServer::tool(GetWorkItemTool::class, [
        'item' => 'ENG-1',
    ]);
    $getResponse->assertOk()
        ->assertSee('ENG-1')
        ->assertSee('Diseñar arquitectura MCP')
        ->assertSee('description_html')
        ->assertSee('<p>Definir protocolo stdio y web con Laravel MCP</p>', false);

    // 3. Actualizar WorkItem (cambio a completado y nueva descripción en Markdown)
    $updateResponse = ProjectManagementServer::tool(UpdateWorkItemTool::class, [
        'item' => 'ENG-1',
        'description' => "### Nueva Especificación\n- Tarea validada",
        'state_id' => $this->stateDone->id,
        'priority' => 'URGENT',
    ]);
    $updateResponse->assertOk()
        ->assertSee('ENG-1')
        ->assertSee('URGENT');

    $this->assertDatabaseHas('work_items', [
        'project_id' => $this->project->id,
        'sequence_id' => 1,
        'description_html' => "<h3>Nueva Especificación</h3>\n<ul>\n<li>Tarea validada</li>\n</ul>\n",
    ]);

    $item = WorkItem::where('project_id', $this->project->id)->where('sequence_id', 1)->first();
    expect($item->completed_at)->not->toBeNull();

    // 4. Listar WorkItems
    $listResponse = ProjectManagementServer::tool(ListWorkItemsTool::class, [
        'project' => 'ENG',
        'priority' => 'URGENT',
    ]);
    $listResponse->assertOk()
        ->assertSee('ENG-1');

    // 5. Eliminar WorkItem
    $deleteResponse = ProjectManagementServer::tool(DeleteWorkItemTool::class, [
        'item' => 'ENG-1',
    ]);
    $deleteResponse->assertOk()
        ->assertSee('eliminado correctamente');

    $this->assertDatabaseMissing('work_items', [
        'project_id' => $this->project->id,
        'sequence_id' => 1,
    ]);
});

it('manages cycles, modules, milestones and releases via MCP tools', function () {
    // Ciclo
    $createCycle = ProjectManagementServer::tool(CreateCycleTool::class, [
        'project' => 'ENG',
        'name' => 'Sprint 10',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addDays(14)->toDateString(),
        'status' => 'CURRENT',
    ]);
    $createCycle->assertOk()->assertSee('Sprint 10');

    $listCycles = ProjectManagementServer::tool(ListCyclesTool::class, ['project' => 'ENG']);
    $listCycles->assertOk()->assertSee('Sprint 10');

    // Módulo
    $createModule = ProjectManagementServer::tool(CreateModuleTool::class, [
        'project' => 'ENG',
        'name' => 'Módulo de Pagos',
        'status' => 'IN_PROGRESS',
    ]);
    $createModule->assertOk()->assertSee('Módulo de Pagos');

    $listModules = ProjectManagementServer::tool(ListModulesTool::class, ['project' => 'ENG']);
    $listModules->assertOk()->assertSee('Módulo de Pagos');

    // Hito
    $createMilestone = ProjectManagementServer::tool(CreateMilestoneTool::class, [
        'project' => 'ENG',
        'title' => 'Lanzamiento v1.0',
        'target_date' => now()->addDays(30)->toDateString(),
    ]);
    $createMilestone->assertOk()->assertSee('Lanzamiento v1.0');

    $listMilestones = ProjectManagementServer::tool(ListMilestonesTool::class, ['project' => 'ENG']);
    $listMilestones->assertOk()->assertSee('Lanzamiento v1.0');

    // Versión / Release
    $createRelease = ProjectManagementServer::tool(CreateReleaseTool::class, [
        'project' => 'ENG',
        'version' => 'v1.0.0',
        'name' => 'Producción v1.0',
        'status' => 'PUBLISHED',
    ]);
    $createRelease->assertOk()->assertSee('v1.0.0');

    $listReleases = ProjectManagementServer::tool(ListReleasesTool::class, ['project' => 'ENG']);
    $listReleases->assertOk()->assertSee('v1.0.0');
});

it('lists workflow states and labels via MCP tools', function () {
    $statesResponse = ProjectManagementServer::tool(ListProjectStatesTool::class, [
        'project' => 'ENG',
    ]);
    $statesResponse->assertOk()
        ->assertSee('Backlog')
        ->assertSee('Done');

    $labelsResponse = ProjectManagementServer::tool(ListProjectLabelsTool::class, [
        'project' => 'ENG',
    ]);
    $labelsResponse->assertOk()
        ->assertSee('total_labels');
});

it('provides project list and summary resources for AI context', function () {
    $listResource = ProjectManagementServer::resource(ProjectListResource::class);
    $listResource->assertOk()
        ->assertSee('ENG')
        ->assertSee('Backend Engineering');

    $summaryResource = ProjectManagementServer::resource(ProjectSummaryResource::class, [
        'project' => 'ENG',
    ]);
    $summaryResource->assertOk()
        ->assertSee('Backend Engineering (ENG)')
        ->assertSee('Métricas Generales');
});

it('generates prompt templates for sprint planning and project review', function () {
    $planPrompt = ProjectManagementServer::prompt(PlanSprintPrompt::class, [
        'project' => 'ENG',
        'sprint_goal' => 'Completar integración de pagos y checkout',
        'capacity_points' => 30,
    ]);
    $planPrompt->assertOk()
        ->assertSee('Completar integración de pagos')
        ->assertSee('Backend Engineering (ENG)');

    $healthPrompt = ProjectManagementServer::prompt(ProjectHealthReviewPrompt::class, [
        'project' => 'ENG',
    ]);
    $healthPrompt->assertOk()
        ->assertSee('salud y riesgo')
        ->assertSee('ENG');
});

it('authenticates and responds to web MCP requests', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/list',
        'params' => [],
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('jsonrpc', '2.0')
        ->assertJsonPath('id', 1);

    expect(count($response->json('result.tools')))->toBe(15);
    expect($response->json('result.nextCursor'))->not->toBeNull();
});

it('allows unauthenticated web MCP requests in local development falling back to admin', function () {
    $response = $this->withHeaders([
        'Accept' => 'application/json',
    ])->postJson('/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 2,
        'method' => 'tools/call',
        'params' => [
            'name' => 'list_projects',
            'arguments' => [],
        ],
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('jsonrpc', '2.0')
        ->assertJsonPath('id', 2)
        ->assertJsonPath('result.isError', false);

    expect($response->json('result.content.0.text'))->toContain('ENG');
});

it('supports web MCP requests through the /api/mcp/project-management alias', function () {
    $response = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 3,
        'method' => 'tools/list',
        'params' => [],
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('jsonrpc', '2.0')
        ->assertJsonPath('id', 3);

    expect(count($response->json('result.tools')))->toBe(15);
});

it('enforces RBAC permissions for non-admin workspace members', function () {
    $regularUser = User::factory()->create([
        'is_instance_admin' => false,
    ]);
    $regularToken = $regularUser->createToken('regular-token')->plainTextToken;

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $regularUser->id,
        'role' => 'MEMBER',
    ]);

    $projectA = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Proyecto Accesible',
        'identifier' => 'PRJA',
        'lead_id' => $this->user->id,
    ]);
    ProjectMember::create([
        'project_id' => $projectA->id,
        'user_id' => $regularUser->id,
        'role' => 'MEMBER',
    ]);
    State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $projectA->id,
        'name' => 'Backlog',
        'group' => 'BACKLOG',
        'sequence' => 1,
        'is_default' => true,
    ]);

    $projectB = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Proyecto Privado',
        'identifier' => 'PRJB',
        'lead_id' => $this->user->id,
    ]);

    // 1. Listar proyectos: solo debe listar PRJA, no PRJB
    $listResponse = $this->withHeaders([
        'Authorization' => "Bearer {$regularToken}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 10,
        'method' => 'tools/call',
        'params' => [
            'name' => 'list_projects',
            'arguments' => [],
        ],
    ]);

    $listResponse->assertStatus(200);
    $textA = $listResponse->json('result.content.0.text');
    expect($textA)->toContain('PRJA');
    expect($textA)->not->toContain('PRJB');

    // 2. Intentar consultar Proyecto Ajeno (PRJB): debe denegar acceso
    $getResponse = $this->withHeaders([
        'Authorization' => "Bearer {$regularToken}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 11,
        'method' => 'tools/call',
        'params' => [
            'name' => 'get_project',
            'arguments' => ['project' => 'PRJB'],
        ],
    ]);

    $getResponse->assertStatus(200);
    expect($getResponse->json('result.isError'))->toBeTrue();
    expect($getResponse->json('result.content.0.text'))->toContain('Acceso denegado');

    // 3. Intentar eliminar Proyecto Accesible (PRJA) teniendo rol MEMBER: debe denegar por falta de rol ADMIN
    $deleteResponse = $this->withHeaders([
        'Authorization' => "Bearer {$regularToken}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 12,
        'method' => 'tools/call',
        'params' => [
            'name' => 'delete_project',
            'arguments' => [
                'project' => 'PRJA',
                'confirm_identifier' => 'PRJA',
            ],
        ],
    ]);

    $deleteResponse->assertStatus(200);
    expect($deleteResponse->json('result.isError'))->toBeTrue();
    expect($deleteResponse->json('result.content.0.text'))->toContain('Requiere rol de Administrador');

    // 4. Crear work item en Proyecto Accesible (PRJA) como MEMBER: debe permitirlo
    $createItemResponse = $this->withHeaders([
        'Authorization' => "Bearer {$regularToken}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 13,
        'method' => 'tools/call',
        'params' => [
            'name' => 'create_work_item',
            'arguments' => [
                'project' => 'PRJA',
                'title' => 'Tarea creada por miembro regular',
            ],
        ],
    ]);

    $createItemResponse->assertStatus(200);
    expect($createItemResponse->json('result.isError'))->toBeFalse();
    expect($createItemResponse->json('result.content.0.text'))->toContain('Tarea creada por miembro regular');

    // 5. Intentar actualizar configuración del proyecto (PRJA) como MEMBER: debe denegar
    $updateProjResponse = $this->withHeaders([
        'Authorization' => "Bearer {$regularToken}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 14,
        'method' => 'tools/call',
        'params' => [
            'name' => 'update_project',
            'arguments' => [
                'project' => 'PRJA',
                'name' => 'Nombre Cambiado No Permitido',
            ],
        ],
    ]);

    $updateProjResponse->assertStatus(200);
    expect($updateProjResponse->json('result.isError'))->toBeTrue();
    expect($updateProjResponse->json('result.content.0.text'))->toContain('Requiere rol de Administrador');

    // 6. Intentar crear un ciclo (sprint) como MEMBER: debe denegar
    $createCycleResponse = $this->withHeaders([
        'Authorization' => "Bearer {$regularToken}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 15,
        'method' => 'tools/call',
        'params' => [
            'name' => 'create_cycle',
            'arguments' => [
                'project' => 'PRJA',
                'name' => 'Sprint No Autorizado',
            ],
        ],
    ]);

    $createCycleResponse->assertStatus(200);
    expect($createCycleResponse->json('result.isError'))->toBeTrue();
    expect($createCycleResponse->json('result.content.0.text'))->toContain('Requiere rol de Administrador');
});

it('manages project members and invitations via MCP tools', function () {
    // 1. Listar miembros iniciales del proyecto
    $listResponse = ProjectManagementServer::tool(ListProjectMembersTool::class, [
        'project' => 'ENG',
    ]);
    $listResponse->assertOk()
        ->assertSee('Backend Engineering');

    // 2. Agregar un usuario existente por email
    $developer = User::factory()->create([
        'name' => 'Alice Dev',
        'email' => 'alice@example.com',
    ]);

    $addExistingResponse = ProjectManagementServer::tool(AddProjectMemberTool::class, [
        'project' => 'ENG',
        'email' => 'alice@example.com',
        'role' => 'MEMBER',
    ]);
    $addExistingResponse->assertOk()
        ->assertSee('MEMBER_ADDED')
        ->assertSee('alice@example.com');

    $this->assertDatabaseHas('project_members', [
        'project_id' => $this->project->id,
        'user_id' => $developer->id,
        'role' => 'MEMBER',
    ]);

    // 3. Invitar un correo que no existe en el sistema
    $inviteResponse = ProjectManagementServer::tool(AddProjectMemberTool::class, [
        'project' => 'ENG',
        'email' => 'newuser@example.com',
        'role' => 'VIEWER',
    ]);
    $inviteResponse->assertOk()
        ->assertSee('INVITATION_SENT')
        ->assertSee('newuser@example.com');

    $this->assertDatabaseHas('project_invitations', [
        'project_id' => $this->project->id,
        'email' => 'newuser@example.com',
        'role' => 'VIEWER',
        'status' => 'PENDING',
    ]);

    $invitation = ProjectInvitation::where('project_id', $this->project->id)
        ->where('email', 'newuser@example.com')
        ->first();

    // 4. Actualizar el rol de Alice a ADMIN
    $updateRoleResponse = ProjectManagementServer::tool(UpdateProjectMemberRoleTool::class, [
        'project' => 'ENG',
        'user' => 'alice@example.com',
        'role' => 'ADMIN',
    ]);
    $updateRoleResponse->assertOk()
        ->assertSee('ADMIN');

    $this->assertDatabaseHas('project_members', [
        'project_id' => $this->project->id,
        'user_id' => $developer->id,
        'role' => 'ADMIN',
    ]);

    // 5. Cancelar la invitación pendiente
    $cancelInvResponse = ProjectManagementServer::tool(RemoveProjectMemberTool::class, [
        'project' => 'ENG',
        'invitation_id' => $invitation->id,
    ]);
    $cancelInvResponse->assertOk()
        ->assertSee("Invitación #{$invitation->id} cancelada exitosamente");

    $this->assertDatabaseMissing('project_invitations', [
        'id' => $invitation->id,
    ]);

    // 6. Remover a Alice del proyecto
    $removeMemberResponse = ProjectManagementServer::tool(RemoveProjectMemberTool::class, [
        'project' => 'ENG',
        'user' => (string) $developer->id,
    ]);
    $removeMemberResponse->assertOk()
        ->assertSee('desvinculado del proyecto');

    $this->assertDatabaseMissing('project_members', [
        'project_id' => $this->project->id,
        'user_id' => $developer->id,
    ]);
});

it('enforces RBAC for member management in MCP', function () {
    $regularUser = User::factory()->create([
        'is_instance_admin' => false,
    ]);
    $regularToken = $regularUser->createToken('regular-member-token')->plainTextToken;

    WorkspaceMember::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $regularUser->id,
        'role' => 'MEMBER',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $regularUser->id,
        'role' => 'MEMBER',
    ]);

    // 1. Usuario regular PUEDE listar miembros del proyecto
    $listResponse = $this->withHeaders([
        'Authorization' => "Bearer {$regularToken}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 101,
        'method' => 'tools/call',
        'params' => [
            'name' => 'list_project_members',
            'arguments' => [
                'project' => 'ENG',
            ],
        ],
    ]);

    $listResponse->assertStatus(200);
    expect($listResponse->json('result.isError'))->toBeFalsy();
    expect($listResponse->json('result.content.0.text'))->toContain('Backend Engineering');

    // 2. Usuario regular NO PUEDE agregar miembros al proyecto (requiere ADMIN)
    $addResponse = $this->withHeaders([
        'Authorization' => "Bearer {$regularToken}",
        'X-Workspace-Id' => $this->workspace->id,
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 102,
        'method' => 'tools/call',
        'params' => [
            'name' => 'add_project_member',
            'arguments' => [
                'project' => 'ENG',
                'email' => 'candidate@example.com',
                'role' => 'MEMBER',
            ],
        ],
    ]);

    $addResponse->assertStatus(200);
    expect($addResponse->json('result.isError'))->toBeTrue();
    expect($addResponse->json('result.content.0.text'))->toContain('Requiere rol de Administrador');
});
