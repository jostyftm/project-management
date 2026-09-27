<?php

use App\Http\Controllers\Api\v1\Auth\AuthController;
use App\Http\Controllers\Api\v1\Cycle\CycleController;
use App\Http\Controllers\Api\v1\Module\ModuleController;
use App\Http\Controllers\Api\v1\Project\ProjectController;
use App\Http\Controllers\Api\v1\User\UserController;
use App\Http\Controllers\Api\v1\View\ViewController;
use App\Http\Controllers\Api\v1\Workspace\WorkspaceController;
use App\Http\Controllers\Api\v1\WorkItem\WorkItemController;
use App\Http\Controllers\Api\v1\WorkItem\WorkItemRelationController;
use App\Http\Controllers\Api\v1\WorkItemType\WorkItemTypeController;
use App\Http\Controllers\Api\v1\YourWork\YourWorkController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API V1 Routes (Plane Clone - SDI Architecture)
|--------------------------------------------------------------------------
*/

// Rutas públicas de autenticación
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

// Rutas protegidas con autenticación
Route::middleware(['auth.sdi'])->group(function () {
    // Perfil y cierre de sesión
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

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

        // Proyectos
        Route::apiResource('projects', ProjectController::class);
        Route::get('projects/{project}/states', [ProjectController::class, 'states']);
        Route::post('projects/{project}/states', [ProjectController::class, 'storeState']);
        Route::get('projects/{project}/labels', [ProjectController::class, 'labels']);
        Route::post('projects/{project}/labels', [ProjectController::class, 'storeLabel']);

        // Vistas a nivel de Proyecto (solo para el creador)
        Route::get('projects/{project}/views', [ViewController::class, 'index']);
        Route::post('projects/{project}/views', [ViewController::class, 'store']);

        // Tipos por Proyecto
        Route::get('projects/{project}/work-item-types', [WorkItemTypeController::class, 'index']);
        Route::post('projects/{project}/work-item-types', [WorkItemTypeController::class, 'store']);

        // Ciclos (Sprints)
        Route::get('projects/{project}/cycles', [CycleController::class, 'index']);
        Route::post('projects/{project}/cycles', [CycleController::class, 'store']);
        Route::get('cycles/{cycle}', [CycleController::class, 'show']);
        Route::put('cycles/{cycle}', [CycleController::class, 'update']);
        Route::post('cycles/{cycle}/complete', [CycleController::class, 'complete']);
        Route::get('cycles/{cycle}/analytics', [CycleController::class, 'analytics']);
        Route::post('cycles/{cycle}/work-items', [CycleController::class, 'addWorkItems']);

        // Módulos
        Route::get('projects/{project}/modules', [ModuleController::class, 'index']);
        Route::post('projects/{project}/modules', [ModuleController::class, 'store']);
        Route::get('modules/{module}', [ModuleController::class, 'show']);
        Route::put('modules/{module}', [ModuleController::class, 'update']);
        Route::post('modules/{module}/work-items', [ModuleController::class, 'syncWorkItems']);
        Route::get('modules/{module}/progress', [ModuleController::class, 'progress']);

        // Work Items por Proyecto
        Route::get('projects/{project}/work-items', [WorkItemController::class, 'index']);
        Route::post('projects/{project}/work-items', [WorkItemController::class, 'store']);

        // Operaciones individuales de Work Items
        Route::get('work-items/{work_item}', [WorkItemController::class, 'show']);
        Route::put('work-items/{work_item}', [WorkItemController::class, 'update']);
        Route::delete('work-items/{work_item}', [WorkItemController::class, 'destroy']);

        // Relaciones entre Work Items
        Route::post('work-items/{work_item}/relations', [WorkItemRelationController::class, 'store']);
        Route::delete('work-items/relations/{relation}', [WorkItemRelationController::class, 'destroy']);
    });
});
