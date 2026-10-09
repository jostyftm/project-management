<?php

use App\Exceptions\ApiHandlerException;
use App\Http\Middleware\AuthenticateSdiUser;
use App\Http\Middleware\AuthorizeProjectAccess;
use App\Http\Middleware\AuthorizeWorkspaceOwner;
use App\Http\Middleware\IdentifyWorkspace;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'auth.sdi' => AuthenticateSdiUser::class,
            'workspace' => IdentifyWorkspace::class,
            'project.member' => AuthorizeProjectAccess::class,
            'workspace.owner' => AuthorizeWorkspaceOwner::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (Exception $e) {
            $hanlder = new ApiHandlerException($e);

            return $hanlder->render();
        });
    })->create();
