<?php

use App\Http\Controllers\Api\v1\Activity\ActivityController;
use App\Http\Controllers\Api\v1\Auth\AuthController;
use App\Http\Controllers\Api\v1\Automation\AutomationRuleController;
use App\Http\Controllers\Api\v1\Automation\RecurringWorkItemController;
use App\Http\Controllers\Api\v1\Comment\CommentController;
use App\Http\Controllers\Api\v1\Cycle\CycleController;
use App\Http\Controllers\Api\v1\Initiative\InitiativeController;
use App\Http\Controllers\Api\v1\InstanceAdmin\InstanceAdminController;
use App\Http\Controllers\Api\v1\Integration\GitHubWebhookController;
use App\Http\Controllers\Api\v1\Integration\IntegrationController;
use App\Http\Controllers\Api\v1\Integration\ProjectGitHubController;
use App\Http\Controllers\Api\v1\Integration\WorkspaceGitHubController;
use App\Http\Controllers\Api\v1\Invitation\InvitationController;
use App\Http\Controllers\Api\v1\Milestone\MilestoneController;
use App\Http\Controllers\Api\v1\Module\ModuleController;
use App\Http\Controllers\Api\v1\Notification\NotificationController;
use App\Http\Controllers\Api\v1\Page\PageAnalyticsController;
use App\Http\Controllers\Api\v1\Page\PageController;
use App\Http\Controllers\Api\v1\Project\ProjectAnalyticsController;
use App\Http\Controllers\Api\v1\Project\ProjectController;
use App\Http\Controllers\Api\v1\Project\ProjectMemberController;
use App\Http\Controllers\Api\v1\Release\ReleaseController;
use App\Http\Controllers\Api\v1\Report\ReportBlockController;
use App\Http\Controllers\Api\v1\Report\ReportDataController;
use App\Http\Controllers\Api\v1\Report\ReportSnapshotController;
use App\Http\Controllers\Api\v1\Report\WorkspaceReportController;
use App\Http\Controllers\Api\v1\Sticky\StickyController;
use App\Http\Controllers\Api\v1\Stream\StreamController;
use App\Http\Controllers\Api\v1\Teamspace\TeamspaceController;
use App\Http\Controllers\Api\v1\User\UserController;
use App\Http\Controllers\Api\v1\View\ViewController;
use App\Http\Controllers\Api\v1\Webhook\WebhookController;
use App\Http\Controllers\Api\v1\WorkItem\WorkItemController;
use App\Http\Controllers\Api\v1\WorkItem\WorkItemDeliverableController;
use App\Http\Controllers\Api\v1\WorkItem\WorkItemImportController;
use App\Http\Controllers\Api\v1\WorkItem\WorkItemRelationController;
use App\Http\Controllers\Api\v1\WorkItemType\WorkItemTypeController;
use App\Http\Controllers\Api\v1\Workspace\WorkspaceController;
use App\Http\Controllers\Api\v1\YourWork\YourWorkController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API V1 Routes (Plane Clone - SDI Architecture)
|--------------------------------------------------------------------------
*/

// Rutas públicas de autenticación e invitaciones
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
});

Route::get('invitations/{token}', [InvitationController::class, 'show']);
Route::post('invitations/{token}/onboard', [InvitationController::class, 'onboard']);

// GitHub Incoming Webhooks (autenticado por firma criptográfica HMAC-SHA256)
Route::post('integrations/github/webhook', [GitHubWebhookController::class, 'handleOrganizationWebhook']);
Route::post('integrations/github/webhook/{repoId}', [GitHubWebhookController::class, 'handle']);

// Rutas protegidas con autenticación
Route::middleware(['auth.sdi'])->group(function () {
    // Perfil y cierre de sesión
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    // Aceptación de invitaciones
    Route::post('invitations/{token}/accept', [InvitationController::class, 'accept']);

    // Módulo de Gobernanza / Instance Admin
    Route::prefix('instance-admin')->group(function () {
        Route::get('settings', [InstanceAdminController::class, 'getSettings']);
        Route::put('settings', [InstanceAdminController::class, 'updateSettings']);
        Route::get('health', [InstanceAdminController::class, 'getHealth']);
        Route::get('users', [InstanceAdminController::class, 'getUsers']);
        Route::put('users/{id}/admin-status', [InstanceAdminController::class, 'toggleUserAdmin']);
        Route::post('test-email', [InstanceAdminController::class, 'testEmail']);
    });

    // Usuarios del sistema
    Route::apiResource('users', UserController::class);

    // Gestión de Workspaces
    Route::apiResource('workspaces', WorkspaceController::class);
    Route::post('workspaces/{workspace}/members', [WorkspaceController::class, 'addMember']);
    Route::get('workspaces/{workspace}/members', [WorkspaceController::class, 'members']);

    // Rutas con ámbito de Workspace activo (Header X-Workspace-Id)
    Route::middleware(['workspace'])->group(function () {
        // Your Work (Panel personal por pestañas: asignadas, creadas, borradores)
        Route::get('your-work', [YourWorkController::class, 'index']);

        // Tipos globales de Work Items
        Route::get('work-item-types', [WorkItemTypeController::class, 'index']);
        Route::post('work-item-types', [WorkItemTypeController::class, 'store']);

        // Vistas a nivel de Workspace (solo para el creador)
        Route::get('views', [ViewController::class, 'index']);
        Route::post('views', [ViewController::class, 'store']);
        Route::get('views/{view}', [ViewController::class, 'show']);
        Route::put('views/{view}', [ViewController::class, 'update']);
        Route::delete('views/{view}', [ViewController::class, 'destroy']);

        // Knowledge Management & Wiki (Pages, Tree, Analytics, Report Generation)
        Route::get('pages/tree', [PageController::class, 'tree']);
        Route::post('pages/generate-report', [PageController::class, 'generateReport']);
        Route::apiResource('pages', PageController::class);
        Route::post('pages/{page}/view', [PageAnalyticsController::class, 'recordView']);
        Route::get('pages/{page}/analytics', [PageAnalyticsController::class, 'show']);

        // Strategic Planning: Initiatives & Teamspaces
        Route::apiResource('initiatives', InitiativeController::class);
        Route::apiResource('teamspaces', TeamspaceController::class);

        // Stickies (Tablero tipo corcho de notas rápidas)
        Route::apiResource('stickies', StickyController::class);
        Route::post('stickies/{sticky}/pin', [StickyController::class, 'togglePin']);
        Route::post('stickies/{sticky}/privacy', [StickyController::class, 'togglePrivacy']);

        // Notificaciones & Inbox
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        // Comentarios a nivel de página
        Route::get('pages/{page}/comments', [CommentController::class, 'indexByPage']);
        Route::post('comments', [CommentController::class, 'store']);
        Route::delete('comments/{id}', [CommentController::class, 'destroy']);

        // Server-Sent Events (SSE) Live Stream
        Route::get('live-stream', [StreamController::class, 'stream']);

        // Webhooks
        Route::apiResource('webhooks', WebhookController::class)->only(['index', 'store', 'destroy']);
        Route::post('webhooks/{id}/test', [WebhookController::class, 'test']);

        // Integraciones Workspace (Slack & Custom)
        Route::get('integrations', [IntegrationController::class, 'index']);
        Route::post('integrations', [IntegrationController::class, 'store']);
        Route::delete('integrations/{id}', [IntegrationController::class, 'destroy']);
        Route::post('integrations/{id}/test', [IntegrationController::class, 'test']);

        // Integración de GitHub a Nivel de Workspace y Reportes Dinámicos (Solo Propietario del Workspace)
        Route::middleware(['workspace.owner'])->group(function () {
            Route::get('workspaces/{workspace}/integrations/github', [WorkspaceGitHubController::class, 'show']);
            Route::post('workspaces/{workspace}/integrations/github/verify', [WorkspaceGitHubController::class, 'verify']);
            Route::post('workspaces/{workspace}/integrations/github/connect', [WorkspaceGitHubController::class, 'connect']);
            Route::post('workspaces/{workspace}/integrations/github/sync', [WorkspaceGitHubController::class, 'sync']);
            Route::delete('workspaces/{workspace}/integrations/github', [WorkspaceGitHubController::class, 'disconnect']);

            // Reportes Dinámicos de Workspace
            Route::get('workspaces/{workspace}/workspace-reports', [WorkspaceReportController::class, 'index']);
            Route::get('workspaces/{workspace}/workspace-reports/templates', [WorkspaceReportController::class, 'templates']);
            Route::post('workspaces/{workspace}/workspace-reports', [WorkspaceReportController::class, 'store']);
            Route::get('workspaces/{workspace}/workspace-reports/{workspaceReport}', [WorkspaceReportController::class, 'show']);
            Route::match(['put', 'patch'], 'workspaces/{workspace}/workspace-reports/{workspaceReport}', [WorkspaceReportController::class, 'update']);
            Route::delete('workspaces/{workspace}/workspace-reports/{workspaceReport}', [WorkspaceReportController::class, 'destroy']);
            Route::post('workspaces/{workspace}/workspace-reports/{workspaceReport}/publish', [WorkspaceReportController::class, 'publish']);
            Route::post('workspaces/{workspace}/workspace-reports/{workspaceReport}/duplicate', [WorkspaceReportController::class, 'duplicate']);
            Route::post('workspaces/{workspace}/workspace-reports/{workspaceReport}/apply-template', [WorkspaceReportController::class, 'applyTemplate']);

            // Bloques del reporte
            Route::get('workspaces/{workspace}/workspace-reports/{workspaceReport}/blocks', [ReportBlockController::class, 'index']);
            Route::post('workspaces/{workspace}/workspace-reports/{workspaceReport}/blocks', [ReportBlockController::class, 'store']);
            Route::get('workspaces/{workspace}/workspace-reports/{workspaceReport}/blocks/{block}', [ReportBlockController::class, 'show']);
            Route::match(['put', 'patch'], 'workspaces/{workspace}/workspace-reports/{workspaceReport}/blocks/{block}', [ReportBlockController::class, 'update']);
            Route::delete('workspaces/{workspace}/workspace-reports/{workspaceReport}/blocks/{block}', [ReportBlockController::class, 'destroy']);
            Route::post('workspaces/{workspace}/workspace-reports/{workspaceReport}/blocks/reorder', [ReportBlockController::class, 'reorder']);

            // Snapshots / Versionado Histórico
            Route::get('workspaces/{workspace}/workspace-reports/{workspaceReport}/snapshots', [ReportSnapshotController::class, 'index']);
            Route::post('workspaces/{workspace}/workspace-reports/{workspaceReport}/snapshots', [ReportSnapshotController::class, 'store']);
            Route::get('workspaces/{workspace}/workspace-reports/{workspaceReport}/snapshots/{snapshot}', [ReportSnapshotController::class, 'show']);
            Route::delete('workspaces/{workspace}/workspace-reports/{workspaceReport}/snapshots/{snapshot}', [ReportSnapshotController::class, 'destroy']);
            Route::post('workspaces/{workspace}/workspace-reports/{workspaceReport}/snapshots/{snapshot}/restore', [ReportSnapshotController::class, 'restore']);

            // Datos del resolver
            Route::get('workspaces/{workspace}/workspace-reports/{workspaceReport}/data', [ReportDataController::class, 'allData']);
            Route::get('workspaces/{workspace}/workspace-reports/{workspaceReport}/blocks/{block}/data', [ReportDataController::class, 'blockData']);

            // Exportación PDF y PNG
            Route::get('workspaces/{workspace}/workspace-reports/{workspaceReport}/export/pdf', [WorkspaceReportController::class, 'exportPdf']);
            Route::get('workspaces/{workspace}/workspace-reports/{workspaceReport}/export/png', [WorkspaceReportController::class, 'exportPng']);
        });

        // Importador Masivo CSV (Plantilla global)
        Route::get('import/csv/template', [WorkItemImportController::class, 'downloadTemplate']);
        Route::post('integrations/github/simulate', [GitHubWebhookController::class, 'simulate']);

        // Proyectos: Listado global y Creación
        Route::get('projects', [ProjectController::class, 'index']);
        Route::post('projects', [ProjectController::class, 'store']);

        // =========================================================================
        // RUTAS ACCESIBLES PARA CUALQUIER MIEMBRO DEL PROYECTO (o Admin / Dueño)
        // =========================================================================
        Route::middleware(['project.member'])->group(function () {
            // Visualización de Proyecto y Catálogos
            Route::get('projects/{project}', [ProjectController::class, 'show']);
            Route::get('projects/{project}/states', [ProjectController::class, 'states']);
            Route::get('projects/{project}/labels', [ProjectController::class, 'labels']);
            Route::get('projects/{project}/work-item-types', [WorkItemTypeController::class, 'index']);

            // Vistas a nivel de Proyecto (guardadas por usuario)
            Route::get('projects/{project}/views', [ViewController::class, 'index']);
            Route::post('projects/{project}/views', [ViewController::class, 'store']);

            // Miembros (consulta)
            Route::get('projects/{project}/members', [ProjectMemberController::class, 'index']);

            // Páginas y Wiki a nivel de Proyecto
            Route::get('projects/{project}/pages', [PageController::class, 'index']);
            Route::post('projects/{project}/pages', [PageController::class, 'store']);
            Route::get('projects/{project}/pages/tree', [PageController::class, 'tree']);

            // Work Items (Visualización para miembros y cambio de estado para asignados)
            Route::get('projects/{project}/work-items', [WorkItemController::class, 'index']);
            Route::get('work-items/{work_item}', [WorkItemController::class, 'show']);
            Route::match(['put', 'patch'], 'work-items/{work_item}', [WorkItemController::class, 'update']);
            Route::get('work-items/{work_item}/comments', [CommentController::class, 'indexByWorkItem']);
            Route::get('work-items/{work_item}/activities', [ActivityController::class, 'indexByWorkItem']);
            Route::get('work-items/{work_item}/github', [ProjectGitHubController::class, 'getWorkItemGitHub']);

            // Entregables y Criterios DoD de la Historia de Usuario
            Route::get('projects/{project}/work-items/{workItem}/deliverables', [WorkItemDeliverableController::class, 'index']);
            Route::post('projects/{project}/work-items/{workItem}/deliverables', [WorkItemDeliverableController::class, 'store']);
            Route::get('projects/{project}/work-items/{workItem}/deliverables/{deliverable}/download', [WorkItemDeliverableController::class, 'download']);
            Route::delete('projects/{project}/work-items/{workItem}/deliverables/{deliverable}', [WorkItemDeliverableController::class, 'destroy']);
            Route::patch('projects/{project}/work-items/{workItem}/deliverables/{deliverable}/review', [WorkItemDeliverableController::class, 'review']);
            Route::post('projects/{project}/work-items/{workItem}/dod-items', [WorkItemDeliverableController::class, 'storeDod']);
            Route::patch('projects/{project}/work-items/{workItem}/dod-items/{dodItem}', [WorkItemDeliverableController::class, 'toggleDod']);
            Route::delete('projects/{project}/work-items/{workItem}/dod-items/{dodItem}', [WorkItemDeliverableController::class, 'destroyDod']);

            // Ciclos (Visualización para miembros)
            Route::get('projects/{project}/cycles', [CycleController::class, 'index']);
            Route::get('cycles/{cycle}', [CycleController::class, 'show']);
            Route::get('cycles/{cycle}/analytics', [CycleController::class, 'analytics']);

            // Módulos (Visualización para miembros)
            Route::get('projects/{project}/modules', [ModuleController::class, 'index']);
            Route::get('modules/{module}', [ModuleController::class, 'show']);
            Route::get('modules/{module}/progress', [ModuleController::class, 'progress']);

            // Hitos (Visualización para miembros)
            Route::get('projects/{project}/milestones', [MilestoneController::class, 'index']);
            Route::get('milestones/{milestone}', [MilestoneController::class, 'show']);

            // Releases (Visualización para miembros)
            Route::get('projects/{project}/releases', [ReleaseController::class, 'index']);
            Route::get('releases/{release}', [ReleaseController::class, 'show']);

            // GitHub Repos & Branches (Visualización para miembros)
            Route::get('projects/{project}/github', [ProjectGitHubController::class, 'index']);
            Route::get('projects/{project}/github/branches', [ProjectGitHubController::class, 'branches']);

            // Analíticas y KPIs del Proyecto y Colaboradores
            Route::get('projects/{project}/analytics/overview', [ProjectAnalyticsController::class, 'overview']);
            Route::get('projects/{project}/analytics/velocity', [ProjectAnalyticsController::class, 'velocity']);
            Route::get('projects/{project}/analytics/cycle-time', [ProjectAnalyticsController::class, 'cycleTime']);
            Route::get('projects/{project}/analytics/members', [ProjectAnalyticsController::class, 'members']);
            Route::get('projects/{project}/analytics/members/{user}', [ProjectAnalyticsController::class, 'memberDetail']);
        });

        // =========================================================================
        // RUTAS EXCLUSIVAS PARA ADMINISTRADORES DEL PROYECTO (o Admin / Dueño)
        // =========================================================================
        Route::middleware(['project.member:admin'])->group(function () {
            // Edición y Eliminación de Proyecto
            Route::put('projects/{project}', [ProjectController::class, 'update']);
            Route::delete('projects/{project}', [ProjectController::class, 'destroy']);
            Route::post('projects/{project}/states', [ProjectController::class, 'storeState']);
            Route::post('projects/{project}/labels', [ProjectController::class, 'storeLabel']);
            Route::post('projects/{project}/work-item-types', [WorkItemTypeController::class, 'store']);

            // Gestión de Miembros e Invitaciones
            Route::post('projects/{project}/members', [ProjectMemberController::class, 'store']);
            Route::put('projects/{project}/members/{user}', [ProjectMemberController::class, 'update']);
            Route::delete('projects/{project}/members/{user}', [ProjectMemberController::class, 'destroy']);
            Route::delete('projects/{project}/invitations/{invitation}', [ProjectMemberController::class, 'cancelInvitation']);

            // Gestión de Ciclos
            Route::post('projects/{project}/cycles', [CycleController::class, 'store']);
            Route::put('cycles/{cycle}', [CycleController::class, 'update']);
            Route::post('cycles/{cycle}/complete', [CycleController::class, 'complete']);
            Route::delete('cycles/{cycle}', [CycleController::class, 'destroy']);
            Route::post('cycles/{cycle}/work-items', [CycleController::class, 'addWorkItems']);
            Route::delete('cycles/{cycle}/work-items/{workItem}', [CycleController::class, 'removeWorkItem']);

            // Gestión de Módulos
            Route::post('projects/{project}/modules', [ModuleController::class, 'store']);
            Route::put('modules/{module}', [ModuleController::class, 'update']);
            Route::post('modules/{module}/work-items', [ModuleController::class, 'syncWorkItems']);

            // Gestión de Hitos
            Route::post('projects/{project}/milestones', [MilestoneController::class, 'store']);
            Route::put('milestones/{milestone}', [MilestoneController::class, 'update']);
            Route::post('milestones/{milestone}/complete', [MilestoneController::class, 'toggleComplete']);
            Route::delete('milestones/{milestone}', [MilestoneController::class, 'destroy']);

            // Gestión de Releases
            Route::post('projects/{project}/releases', [ReleaseController::class, 'store']);
            Route::put('releases/{release}', [ReleaseController::class, 'update']);
            Route::post('releases/{release}/publish', [ReleaseController::class, 'publish']);
            Route::post('releases/{release}/generate-changelog', [ReleaseController::class, 'generateChangelog']);
            Route::delete('releases/{release}', [ReleaseController::class, 'destroy']);

            // Gestión de Work Items
            Route::post('projects/{project}/work-items', [WorkItemController::class, 'store']);
            Route::delete('work-items/{work_item}', [WorkItemController::class, 'destroy']);
            Route::post('work-items/{work_item}/relations', [WorkItemRelationController::class, 'store']);
            Route::delete('work-items/relations/{relation}', [WorkItemRelationController::class, 'destroy']);

            // Auditoría y Registro de Actividades
            Route::get('projects/{project}/activities', [ActivityController::class, 'indexByProject']);

            // GitHub Integración y Configuración
            Route::post('projects/{project}/github/branches', [ProjectGitHubController::class, 'createBranch']);
            Route::post('projects/{project}/github/repositories', [ProjectGitHubController::class, 'storeRepository']);
            Route::put('projects/{project}/github/repositories/{repoId}', [ProjectGitHubController::class, 'updateRepository']);
            Route::delete('projects/{project}/github/repositories/{repoId}', [ProjectGitHubController::class, 'destroyRepository']);
            Route::put('projects/{project}/github/settings', [ProjectGitHubController::class, 'updateSettings']);

            // Importador Masivo CSV
            Route::post('projects/{project}/import/csv/preview', [WorkItemImportController::class, 'preview']);
            Route::post('projects/{project}/import/csv', [WorkItemImportController::class, 'import']);

            // Tareas Recurrentes
            Route::get('projects/{project}/recurring-work-items', [RecurringWorkItemController::class, 'index']);
            Route::post('projects/{project}/recurring-work-items', [RecurringWorkItemController::class, 'store']);
            Route::post('recurring-work-items/{id}/execute', [RecurringWorkItemController::class, 'executeNow']);
            Route::delete('recurring-work-items/{id}', [RecurringWorkItemController::class, 'destroy']);

            // Reglas de Automatización
            Route::get('projects/{project}/automation-rules', [AutomationRuleController::class, 'index']);
            Route::post('projects/{project}/automation-rules', [AutomationRuleController::class, 'store']);
            Route::put('automation-rules/{id}', [AutomationRuleController::class, 'update']);
            Route::delete('automation-rules/{id}', [AutomationRuleController::class, 'destroy']);
            Route::post('automation-rules/{id}/test', [AutomationRuleController::class, 'testRule']);
        });
    });
});

// Ruta pública para reportes dinámicos por token (sin auth)
Route::get('public/workspace-reports/{token}', [WorkspaceReportController::class, 'showPublic'])
    ->middleware('throttle:60,1');
Route::get('public/workspace-reports/{token}/export/pdf', [WorkspaceReportController::class, 'exportPublicPdf'])
    ->middleware('throttle:30,1');
Route::get('public/workspace-reports/{token}/export/png', [WorkspaceReportController::class, 'exportPublicPng'])
    ->middleware('throttle:30,1');
