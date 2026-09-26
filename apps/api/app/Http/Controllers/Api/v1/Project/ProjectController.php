<?php

namespace App\Http\Controllers\Api\v1\Project;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\LabelCreateRequest;
use App\Http\Requests\Project\ProjectCreateRequest;
use App\Http\Requests\Project\ProjectListRequest;
use App\Http\Requests\Project\ProjectUpdateRequest;
use App\Http\Requests\Project\StateCreateRequest;
use App\Http\Resources\Project\LabelResource;
use App\Http\Resources\Project\ProjectResource;
use App\Http\Resources\Project\StateResource;
use App\Models\Project;
use App\Services\ProjectService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;

class ProjectController extends Controller
{
    public function __construct(
        private ProjectService $projectService
    ) {}

    /**
     * Listar proyectos del workspace activo.
     */
    public function index(ProjectListRequest $request): AnonymousResourceCollection
    {
        $projects = $this->projectService->list($request);

        return ProjectResource::collection($projects);
    }

    /**
     * Crear un nuevo proyecto.
     */
    public function store(ProjectCreateRequest $request): JsonResource
    {
        $project = $this->projectService->save($request);

        return new ProjectResource($project);
    }

    /**
     * Ver detalles del proyecto.
     */
    public function show(Project $project): JsonResource
    {
        $project = $this->projectService->get($project);

        return new ProjectResource($project);
    }

    /**
     * Actualizar proyecto.
     */
    public function update(ProjectUpdateRequest $request, Project $project): JsonResource
    {
        $project = $this->projectService->update($request, $project);

        return new ProjectResource($project);
    }

    /**
     * Eliminar proyecto.
     */
    public function destroy(Project $project): Response
    {
        $this->projectService->delete($project);

        return response()->noContent();
    }

    /**
     * Listar estados del proyecto.
     */
    public function states(Project $project): AnonymousResourceCollection
    {
        return StateResource::collection($project->states);
    }

    /**
     * Crear estado en el proyecto.
     */
    public function storeState(StateCreateRequest $request, Project $project): JsonResource
    {
        $state = $this->projectService->createState($request, $project);

        return new StateResource($state);
    }

    /**
     * Listar etiquetas del proyecto.
     */
    public function labels(Project $project): AnonymousResourceCollection
    {
        return LabelResource::collection($project->labels);
    }

    /**
     * Crear etiqueta en el proyecto.
     */
    public function storeLabel(LabelCreateRequest $request, Project $project): JsonResource
    {
        $label = $this->projectService->createLabel($request, $project);

        return new LabelResource($label);
    }
}
