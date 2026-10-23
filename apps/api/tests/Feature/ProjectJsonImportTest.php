<?php

use App\Models\Cycle;
use App\Models\Module;
use App\Models\Project;
use App\Models\Release;
use App\Models\WorkItem;
use App\Models\Workspace;
use Illuminate\Support\Facades\Artisan;

it('imports the jsvr_coding.json project dataset into the univalle workspace', function () {
    $datasetCandidates = [
        storage_path('app/imports/jsvr_coding.json'),
        base_path('storage/app/imports/jsvr_coding.json'),
        '/home/ubuntu/maestria/jsvr_coding.json',
        base_path('../../maestria/jsvr_coding.json'),
    ];

    $datasetExists = collect($datasetCandidates)->contains(fn (string $path): bool => file_exists($path) && is_readable($path));
    if (! $datasetExists) {
        $this->markTestSkipped('Project JSON fixture is not available in this environment.');
    }

    $exitCode = Artisan::call('project:import-json', [
        '--workspace' => 'univalle',
        '--owner' => 'joe.valencia@correounivalle.edu.co',
        '--force' => true,
    ]);

    if ($exitCode !== 0) {
        test()->fail("project:import-json falló con código {$exitCode}:\n".Artisan::output());
    }

    expect($exitCode)->toBe(0);

    // 1. Workspace
    $workspace = Workspace::where('slug', 'univalle')->first();
    expect($workspace)->not->toBeNull();
    expect($workspace->name)->toBe('Univalle');

    // 2. Project
    $project = Project::where('workspace_id', $workspace->id)
        ->where('identifier', 'JSVRC')
        ->first();

    expect($project)->not->toBeNull();
    expect($project->name)->toBe('Helpdesk IA');
    expect($project->estimate_system)->toBe('POINTS');

    // 3. Work Items (Total exacto: 113)
    $workItemsCount = WorkItem::where('project_id', $project->id)->count();
    expect($workItemsCount)->toBe(113);

    // 4. Verificación de sequence_id exacto (JSVRC-131 y JSVRC-18)
    $item131 = WorkItem::where('project_id', $project->id)->where('sequence_id', 131)->first();
    expect($item131)->not->toBeNull();
    expect($item131->title)->toContain('Integrar vista con la API (HU-1.2)');

    $item18 = WorkItem::where('project_id', $project->id)->where('sequence_id', 18)->first();
    expect($item18)->not->toBeNull();
    expect($item18->title)->toContain('Épica 1: Gestión de Identidad');

    // 5. Verificación de Jerarquía Padre-Hijo (JSVRC-131 tiene de padre a JSVRC-12)
    $item12 = WorkItem::where('project_id', $project->id)->where('sequence_id', 12)->first();
    expect($item12)->not->toBeNull();
    expect($item131->parent_id)->toBe($item12->id);

    // JSVRC-12 tiene de padre a JSVRC-18 (Épica 1)
    expect($item12->parent_id)->toBe($item18->id);

    // 6. Verificación de Ciclos / Sprints (9 ciclos creados)
    $cycles = Cycle::where('project_id', $project->id)->get();
    expect($cycles->count())->toBe(9);

    $sprint4 = $cycles->firstWhere('name', 'Sprint #4');
    expect($sprint4)->not->toBeNull();
    expect($sprint4->workItems()->count())->toBeGreaterThan(0);

    // 7. Verificación de Módulos Funcionales (8 módulos creados)
    $modules = Module::where('project_id', $project->id)->get();
    expect($modules->count())->toBe(8);

    $modAdmin = $modules->firstWhere('name', '01 - Administración y Control de Accesos');
    expect($modAdmin)->not->toBeNull();
    expect($modAdmin->workItems()->count())->toBeGreaterThan(0);

    // 8. Verificación de Fechas Históricas de Finalización
    expect($item131->completed_at)->not->toBeNull();
    expect($item131->completed_at->format('Y-m-d'))->toBe('2026-04-08');

    // 9. Verificación de Conversión a HTML Semántico en Descripciones
    $item11 = WorkItem::where('project_id', $project->id)->where('sequence_id', 11)->first();
    expect($item11->description_html)->toContain('<strong>ID-HU:</strong> HU-1.1');
    expect($item11->description_html)->toContain('<strong>Rol:</strong>');
    expect($item11->description_html)->toContain('<h3>Criterios de aceptación</h3>');
    expect($item11->description_html)->toContain('<li>');

    // 10. Verificación de Release / Entrega
    $release = Release::where('project_id', $project->id)->where('version', 'v0.1.0')->first();
    expect($release)->not->toBeNull();
    expect($release->workItems()->where('work_items.id', $item18->id)->exists())->toBeTrue();
});
