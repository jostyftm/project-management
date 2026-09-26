<?php

use App\Http\Controllers\Api\v1\Auth\AuthController;
use App\Http\Controllers\Api\v1\Project\ProjectController;
use App\Http\Controllers\Api\v1\User\UserController;
use App\Http\Controllers\Api\v1\Workspace\WorkspaceController;
use App\Http\Controllers\Api\v1\WorkItem\WorkItemController;
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
        // Proyectos
        Route::apiResource('projects', ProjectController::class);
        Route::get('projects/{project}/states', [ProjectController::class, 'states']);
        Route::post('projects/{project}/states', [ProjectController::class, 'storeState']);
        Route::get('projects/{project}/labels', [ProjectController::class, 'labels']);
        Route::post('projects/{project}/labels', [ProjectController::class, 'storeLabel']);

        // Work Items por Proyecto
        Route::get('projects/{project}/work-items', [WorkItemController::class, 'index']);
        Route::post('projects/{project}/work-items', [WorkItemController::class, 'store']);

        // Operaciones individuales de Work Items
        Route::get('work-items/{work_item}', [WorkItemController::class, 'show']);
        Route::put('work-items/{work_item}', [WorkItemController::class, 'update']);
        Route::delete('work-items/{work_item}', [WorkItemController::class, 'destroy']);
    });
});
