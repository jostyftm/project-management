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
use App\Mcp\Tools\Workspaces\AddWorkspaceMemberTool;
use App\Mcp\Tools\Workspaces\CreateWorkspaceTool;
use App\Mcp\Tools\Workspaces\DeleteWorkspaceTool;
use App\Mcp\Tools\Workspaces\GetWorkspaceTool;
use App\Mcp\Tools\Workspaces\ListWorkspaceMembersTool;
use App\Mcp\Tools\Workspaces\ListWorkspacesTool;
use App\Mcp\Tools\Workspaces\RemoveWorkspaceMemberTool;
use App\Mcp\Tools\Workspaces\UpdateWorkspaceMemberRoleTool;
use App\Mcp\Tools\Workspaces\UpdateWorkspaceTool;
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
        ListWorkspacesTool::class,
        GetWorkspaceTool::class,
        CreateWorkspaceTool::class,
        UpdateWorkspaceTool::class,
        DeleteWorkspaceTool::class,
        ListWorkspaceMembersTool::class,
        AddWorkspaceMemberTool::class,
        RemoveWorkspaceMemberTool::class,
        UpdateWorkspaceMemberRoleTool::class,
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

    // 5. Crear ítem padre (Épica) con sequence_id explícito y tipo textual
    $createParentResponse = ProjectManagementServer::tool(CreateWorkItemTool::class, [
        'project' => 'ENG',
        'sequence_id' => 18,
        'title' => 'Épica 1: Gestión de Identidad',
        'type' => 'Epic',
    ]);
    $createParentResponse->assertOk()
        ->assertSee('ENG-18')
        ->assertSee('Épica 1: Gestión de Identidad');

    $this->assertDatabaseHas('work_items', [
        'project_id' => $this->project->id,
        'sequence_id' => 18,
    ]);

    // 6. Crear ítem hijo vinculado a la épica con completed_at histórico
    $createChildResponse = ProjectManagementServer::tool(CreateWorkItemTool::class, [
        'project' => 'ENG',
        'sequence_id' => 128,
        'title' => 'HU-1.11 - Desactivación de usuarios',
        'parent' => 'ENG-18',
        'type' => 'Story',
        'completed_at' => '2026-04-08T03:24:38Z',
    ]);
    $createChildResponse->assertOk()
        ->assertSee('ENG-128');

    $parentItem = WorkItem::where('project_id', $this->project->id)->where('sequence_id', 18)->first();
    $childItem = WorkItem::where('project_id', $this->project->id)->where('sequence_id', 128)->first();

    expect($childItem->parent_id)->toBe($parentItem->id);
    expect($childItem->completed_at?->format('Y-m-d H:i:s'))->toBe('2026-04-08 03:24:38');

    // 7. Eliminar WorkItem
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

it('manages workspaces lifecycle via MCP tools for admin and regular users', function () {
    $regularUser = User::factory()->create([
        'name' => 'John Regular',
        'email' => 'john.regular@example.com',
        'is_instance_admin' => false,
    ]);

    $otherUser = User::factory()->create([
        'name' => 'Jane Other',
        'email' => 'jane.other@example.com',
        'is_instance_admin' => false,
    ]);

    $regularWorkspace = Workspace::create([
        'name' => 'John Team Workspace',
        'slug' => 'john-team-workspace',
        'owner_id' => $regularUser->id,
    ]);
    WorkspaceMember::create([
        'workspace_id' => $regularWorkspace->id,
        'user_id' => $regularUser->id,
        'role' => 'OWNER',
    ]);

    // 1. Admin lista todos los workspaces
    $adminListResponse = ProjectManagementServer::tool(ListWorkspacesTool::class, [
        'acting_user' => (string) $this->user->id,
    ]);
    $adminListResponse->assertOk()
        ->assertSee('MCP Workspace')
        ->assertSee('John Team Workspace');

    // 2. Admin filtra workspaces de un usuario específico
    $adminFilterResponse = ProjectManagementServer::tool(ListWorkspacesTool::class, [
        'acting_user' => (string) $this->user->id,
        'user' => (string) $regularUser->id,
    ]);
    $adminFilterResponse->assertOk()
        ->assertSee('John Team Workspace')
        ->assertDontSee('MCP Workspace');

    // 3. Usuario regular lista sus propios workspaces (no debe ver el workspace del admin)
    $regularListResponse = ProjectManagementServer::tool(ListWorkspacesTool::class, [
        'acting_user' => (string) $regularUser->id,
    ]);
    $regularListResponse->assertOk()
        ->assertSee('John Team Workspace')
        ->assertDontSee('MCP Workspace');

    // 4. Usuario regular intenta consultar workspaces de otro usuario -> Denegado
    $unauthListResponse = ProjectManagementServer::tool(ListWorkspacesTool::class, [
        'acting_user' => (string) $regularUser->id,
        'user' => (string) $this->user->id,
    ]);
    $unauthListResponse->assertHasErrors();
    $unauthListResponse->assertSee('Acceso denegado');

    // 5. Usuario regular crea workspace para sí mismo
    $createRegResponse = ProjectManagementServer::tool(CreateWorkspaceTool::class, [
        'acting_user' => (string) $regularUser->id,
        'name' => 'Startup Project',
        'slug' => 'startup-project',
    ]);
    $createRegResponse->assertOk()
        ->assertSee('creado exitosamente')
        ->assertSee('Startup Project');

    $this->assertDatabaseHas('workspaces', [
        'name' => 'Startup Project',
        'owner_id' => $regularUser->id,
    ]);

    // 6. Usuario regular intenta crear workspace asignando a otro dueño -> Denegado
    $unauthCreateResponse = ProjectManagementServer::tool(CreateWorkspaceTool::class, [
        'acting_user' => (string) $regularUser->id,
        'name' => 'Spoofed Workspace',
        'owner' => (string) $this->user->id,
    ]);
    $unauthCreateResponse->assertHasErrors();
    $unauthCreateResponse->assertSee('Acceso denegado: Solo los administradores pueden crear espacios de trabajo para otros usuarios.');

    // 7. Admin crea un workspace asignando a otro usuario como propietario
    $adminCreateForOtherResponse = ProjectManagementServer::tool(CreateWorkspaceTool::class, [
        'acting_user' => (string) $this->user->id,
        'name' => 'Jane Workspace',
        'slug' => 'jane-workspace',
        'owner' => $otherUser->email,
    ]);
    $adminCreateForOtherResponse->assertOk()
        ->assertSee('creado exitosamente')
        ->assertSee('Jane Workspace');

    $this->assertDatabaseHas('workspaces', [
        'slug' => 'jane-workspace',
        'owner_id' => $otherUser->id,
    ]);

    // 8. Get Workspace: Usuario regular consulta el suyo
    $getSelfResponse = ProjectManagementServer::tool(GetWorkspaceTool::class, [
        'acting_user' => (string) $regularUser->id,
        'workspace' => 'startup-project',
    ]);
    $getSelfResponse->assertOk()
        ->assertSee('Startup Project')
        ->assertSee('john.regular@example.com');

    // 9. Get Workspace: Usuario regular intenta consultar workspace donde no es miembro -> Denegado
    $unauthGetResponse = ProjectManagementServer::tool(GetWorkspaceTool::class, [
        'acting_user' => (string) $regularUser->id,
        'workspace' => 'mcp-workspace',
    ]);
    $unauthGetResponse->assertHasErrors();
    $unauthGetResponse->assertSee('Acceso denegado: No perteneces al espacio de trabajo');

    // 10. Update Workspace: Regular actualiza su workspace
    $updateResponse = ProjectManagementServer::tool(UpdateWorkspaceTool::class, [
        'acting_user' => (string) $regularUser->id,
        'workspace' => 'startup-project',
        'name' => 'Startup Project Renamed',
    ]);
    $updateResponse->assertOk()
        ->assertSee('actualizado correctamente')
        ->assertSee('Startup Project Renamed');

    // 11. Update Workspace: Transferencia de propiedad por el owner o admin
    $transferResponse = ProjectManagementServer::tool(UpdateWorkspaceTool::class, [
        'acting_user' => (string) $regularUser->id,
        'workspace' => 'startup-project',
        'owner' => (string) $otherUser->id,
    ]);
    $transferResponse->assertOk()
        ->assertSee('actualizado correctamente');

    $this->assertDatabaseHas('workspaces', [
        'slug' => 'startup-project',
        'owner_id' => $otherUser->id,
    ]);

    // 12. Delete Workspace: No-owner regular intenta eliminar -> Denegado
    $unauthDeleteResponse = ProjectManagementServer::tool(DeleteWorkspaceTool::class, [
        'acting_user' => (string) $regularUser->id,
        'workspace' => 'mcp-workspace',
    ]);
    $unauthDeleteResponse->assertHasErrors();
    $unauthDeleteResponse->assertSee('Acceso denegado');

    // 13. Delete Workspace: Admin elimina el workspace
    $deleteResponse = ProjectManagementServer::tool(DeleteWorkspaceTool::class, [
        'acting_user' => (string) $this->user->id,
        'workspace' => 'startup-project',
    ]);
    $deleteResponse->assertOk()
        ->assertSee('eliminado exitosamente');

    $this->assertDatabaseMissing('workspaces', [
        'slug' => 'startup-project',
    ]);
});

it('manages workspace members and enforces RBAC via MCP tools', function () {
    $owner = User::factory()->create(['name' => 'Owner WS', 'email' => 'owner@example.com', 'is_instance_admin' => false]);
    $adminMember = User::factory()->create(['name' => 'Admin Member', 'email' => 'admin.member@example.com', 'is_instance_admin' => false]);
    $regularMember = User::factory()->create(['name' => 'Regular Member', 'email' => 'regular.member@example.com', 'is_instance_admin' => false]);
    $outsider = User::factory()->create(['name' => 'Outsider', 'email' => 'outsider@example.com', 'is_instance_admin' => false]);
    $candidate = User::factory()->create(['name' => 'Candidate', 'email' => 'candidate.ws@example.com', 'is_instance_admin' => false]);

    $testWs = Workspace::create([
        'name' => 'RBAC Team Workspace',
        'slug' => 'rbac-team-workspace',
        'owner_id' => $owner->id,
    ]);

    WorkspaceMember::create(['workspace_id' => $testWs->id, 'user_id' => $owner->id, 'role' => 'OWNER']);
    WorkspaceMember::create(['workspace_id' => $testWs->id, 'user_id' => $adminMember->id, 'role' => 'ADMIN']);
    WorkspaceMember::create(['workspace_id' => $testWs->id, 'user_id' => $regularMember->id, 'role' => 'MEMBER']);

    // 1. Listar miembros: Miembro regular puede listar
    $listResponse = ProjectManagementServer::tool(ListWorkspaceMembersTool::class, [
        'acting_user' => (string) $regularMember->id,
        'workspace' => 'rbac-team-workspace',
    ]);
    $listResponse->assertOk()
        ->assertSee('Owner WS')
        ->assertSee('Admin Member')
        ->assertSee('Regular Member');

    // 2. Listar miembros con filtro por rol
    $listAdminsResponse = ProjectManagementServer::tool(ListWorkspaceMembersTool::class, [
        'acting_user' => (string) $regularMember->id,
        'workspace' => 'rbac-team-workspace',
        'role' => 'ADMIN',
    ]);
    $listAdminsResponse->assertOk()
        ->assertSee('Admin Member')
        ->assertDontSee('Regular Member');

    // 3. Usuario ajeno (outsider) no puede listar miembros
    $outsiderListResponse = ProjectManagementServer::tool(ListWorkspaceMembersTool::class, [
        'acting_user' => (string) $outsider->id,
        'workspace' => 'rbac-team-workspace',
    ]);
    $outsiderListResponse->assertHasErrors();
    $outsiderListResponse->assertSee('Acceso denegado: No perteneces al espacio de trabajo');

    // 4. Miembro regular intenta agregar a un nuevo miembro -> Denegado (requiere ADMIN/OWNER)
    $unauthAddResponse = ProjectManagementServer::tool(AddWorkspaceMemberTool::class, [
        'acting_user' => (string) $regularMember->id,
        'workspace' => 'rbac-team-workspace',
        'user' => $candidate->email,
        'role' => 'MEMBER',
    ]);
    $unauthAddResponse->assertHasErrors();
    $unauthAddResponse->assertSee('Acción denegada: Requiere rol de Administrador o Propietario');

    // 5. Miembro ADMIN agrega al candidato con éxito
    $addResponse = ProjectManagementServer::tool(AddWorkspaceMemberTool::class, [
        'acting_user' => (string) $adminMember->id,
        'workspace' => 'rbac-team-workspace',
        'user' => $candidate->email,
        'role' => 'MEMBER',
    ]);
    $addResponse->assertOk()
        ->assertSee('agregado exitosamente')
        ->assertSee('candidate.ws@example.com');

    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $testWs->id,
        'user_id' => $candidate->id,
        'role' => 'MEMBER',
    ]);

    // 6. Admin intenta actualizar rol de un miembro -> Denegado (solo el OWNER o instance admin puede cambiar roles)
    $unauthUpdateRoleResponse = ProjectManagementServer::tool(UpdateWorkspaceMemberRoleTool::class, [
        'acting_user' => (string) $adminMember->id,
        'workspace' => 'rbac-team-workspace',
        'user' => (string) $candidate->id,
        'role' => 'ADMIN',
    ]);
    $unauthUpdateRoleResponse->assertHasErrors();
    $unauthUpdateRoleResponse->assertSee('Acceso denegado: Solo el propietario del espacio de trabajo');

    // 7. Owner actualiza rol del candidato a ADMIN
    $updateRoleResponse = ProjectManagementServer::tool(UpdateWorkspaceMemberRoleTool::class, [
        'acting_user' => (string) $owner->id,
        'workspace' => 'rbac-team-workspace',
        'user' => (string) $candidate->id,
        'role' => 'ADMIN',
    ]);
    $updateRoleResponse->assertOk()
        ->assertSee('actualizado de')
        ->assertSee('ADMIN');

    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $testWs->id,
        'user_id' => $candidate->id,
        'role' => 'ADMIN',
    ]);

    // 8. Intentar modificar el rol del propio OWNER -> Denegado
    $changeOwnerRoleResponse = ProjectManagementServer::tool(UpdateWorkspaceMemberRoleTool::class, [
        'acting_user' => (string) $owner->id,
        'workspace' => 'rbac-team-workspace',
        'user' => (string) $owner->id,
        'role' => 'MEMBER',
    ]);
    $changeOwnerRoleResponse->assertHasErrors();
    $changeOwnerRoleResponse->assertSee('siempre mantiene el rol OWNER');

    // 9. Intentar remover al OWNER -> Denegado
    $removeOwnerResponse = ProjectManagementServer::tool(RemoveWorkspaceMemberTool::class, [
        'acting_user' => (string) $owner->id,
        'workspace' => 'rbac-team-workspace',
        'user' => (string) $owner->id,
    ]);
    $removeOwnerResponse->assertHasErrors();
    $removeOwnerResponse->assertSee('No se puede remover al propietario del espacio de trabajo');

    // 10. Miembro regular intenta remover a otro miembro -> Denegado
    $unauthRemoveResponse = ProjectManagementServer::tool(RemoveWorkspaceMemberTool::class, [
        'acting_user' => (string) $regularMember->id,
        'workspace' => 'rbac-team-workspace',
        'user' => (string) $candidate->id,
    ]);
    $unauthRemoveResponse->assertHasErrors();
    $unauthRemoveResponse->assertSee('Requiere rol de Administrador o Propietario');

    // 11. Admin remueve al candidato con éxito
    $removeResponse = ProjectManagementServer::tool(RemoveWorkspaceMemberTool::class, [
        'acting_user' => (string) $adminMember->id,
        'workspace' => 'rbac-team-workspace',
        'user' => (string) $candidate->id,
    ]);
    $removeResponse->assertOk()
        ->assertSee('ha sido removido');

    $this->assertDatabaseMissing('workspace_members', [
        'workspace_id' => $testWs->id,
        'user_id' => $candidate->id,
    ]);
});

it('manages workspaces and members via HTTP JSON-RPC MCP requests', function () {
    // 1. Listar workspaces por HTTP
    $listResponse = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 201,
        'method' => 'tools/call',
        'params' => [
            'name' => 'list_workspaces',
            'arguments' => [],
        ],
    ]);

    $listResponse->assertStatus(200);
    expect($listResponse->json('result.isError'))->toBeFalsy();
    expect($listResponse->json('result.content.0.text'))->toContain('MCP Workspace');

    // 2. Crear workspace por HTTP
    $createResponse = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 202,
        'method' => 'tools/call',
        'params' => [
            'name' => 'create_workspace',
            'arguments' => [
                'name' => 'HTTP Workspace API',
                'slug' => 'http-workspace-api',
            ],
        ],
    ]);

    $createResponse->assertStatus(200);
    expect($createResponse->json('result.isError'))->toBeFalsy();
    expect($createResponse->json('result.content.0.text'))->toContain('creado exitosamente');

    // 3. Listar miembros por HTTP
    $membersResponse = $this->withHeaders([
        'Authorization' => "Bearer {$this->token}",
        'Accept' => 'application/json',
    ])->postJson('/api/mcp/project-management', [
        'jsonrpc' => '2.0',
        'id' => 203,
        'method' => 'tools/call',
        'params' => [
            'name' => 'list_workspace_members',
            'arguments' => [
                'workspace' => 'http-workspace-api',
            ],
        ],
    ]);

    $membersResponse->assertStatus(200);
    expect($membersResponse->json('result.isError'))->toBeFalsy();
    expect($membersResponse->json('result.content.0.text'))->toContain('OWNER');
});
