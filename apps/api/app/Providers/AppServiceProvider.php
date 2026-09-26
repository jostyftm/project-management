<?php

namespace App\Providers;

use Dedoc\Scramble\Scramble;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        Scramble::ignoreDefaultRoutes();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Scramble::registerApi('v2', ['info' => ['version' => '2.0']])
            ->expose(
                ui: '/api/v2/docs',
                document: '/docs/v2/openapi.json',
            );
    }
}
