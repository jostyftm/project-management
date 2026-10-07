<?php

namespace App\Mcp\Servers;

use App\Mcp\Prompts\PlanSprintPrompt;
use App\Mcp\Prompts\ProjectHealthReviewPrompt;
use App\Mcp\Resources\ProjectListResource;
use App\Mcp\Resources\ProjectSummaryResource;
use App\Mcp\Tools\Cycles\CreateCycleTool;
use App\Mcp\Tools\Cycles\GetCycleTool;
use App\Mcp\Tools\Cycles\ListCyclesTool;
use App\Mcp\Tools\Cycles\UpdateCycleTool;
use App\Mcp\Tools\Milestones\CreateMilestoneTool;
use App\Mcp\Tools\Milestones\GetMilestoneTool;
use App\Mcp\Tools\Milestones\ListMilestonesTool;
use App\Mcp\Tools\Milestones\UpdateMilestoneTool;
use App\Mcp\Tools\Modules\CreateModuleTool;
use App\Mcp\Tools\Modules\GetModuleTool;
use App\Mcp\Tools\Modules\ListModulesTool;
use App\Mcp\Tools\Modules\UpdateModuleTool;
use App\Mcp\Tools\Projects\CreateProjectTool;
use App\Mcp\Tools\Projects\DeleteProjectTool;
use App\Mcp\Tools\Projects\GetProjectTool;
use App\Mcp\Tools\Projects\ListProjectsTool;
use App\Mcp\Tools\Projects\UpdateProjectTool;
use App\Mcp\Tools\Releases\CreateReleaseTool;
use App\Mcp\Tools\Releases\GetReleaseTool;
use App\Mcp\Tools\Releases\ListReleasesTool;
use App\Mcp\Tools\Releases\UpdateReleaseTool;
use App\Mcp\Tools\Workflow\ListProjectLabelsTool;
use App\Mcp\Tools\Workflow\ListProjectStatesTool;
use App\Mcp\Tools\WorkItems\CreateWorkItemTool;
use App\Mcp\Tools\WorkItems\DeleteWorkItemTool;
use App\Mcp\Tools\WorkItems\GetWorkItemTool;
use App\Mcp\Tools\WorkItems\ListWorkItemsTool;
use App\Mcp\Tools\WorkItems\UpdateWorkItemTool;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('Project Management MCP Server')]
#[Version('1.0.0')]
#[Instructions('Servidor MCP para la gestión integral de desarrollo ágil de software en Plane. Permite listar, consultar, crear, modificar y auditar proyectos, historias de usuario, tareas, bugs, ciclos/sprints, módulos funcionales, hitos estratégicos, versiones (releases) y flujos de trabajo.')]
class ProjectManagementServer extends Server
{
    /**
     * Catálogo completo de herramientas expuestas al modelo de IA.
     */
    protected array $tools = [
        // Projects
        ListProjectsTool::class,
        GetProjectTool::class,
        CreateProjectTool::class,
        UpdateProjectTool::class,
        DeleteProjectTool::class,

        // WorkItems
        ListWorkItemsTool::class,
        GetWorkItemTool::class,
        CreateWorkItemTool::class,
        UpdateWorkItemTool::class,
        DeleteWorkItemTool::class,

        // Cycles / Sprints
        ListCyclesTool::class,
        GetCycleTool::class,
        CreateCycleTool::class,
        UpdateCycleTool::class,

        // Modules
        ListModulesTool::class,
        GetModuleTool::class,
        CreateModuleTool::class,
        UpdateModuleTool::class,

        // Milestones
        ListMilestonesTool::class,
        GetMilestoneTool::class,
        CreateMilestoneTool::class,
        UpdateMilestoneTool::class,

        // Releases
        ListReleasesTool::class,
        GetReleaseTool::class,
        CreateReleaseTool::class,
        UpdateReleaseTool::class,

        // Workflow (States & Labels)
        ListProjectStatesTool::class,
        ListProjectLabelsTool::class,
    ];

    /**
     * Recursos contextuales para los clientes de IA.
     */
    protected array $resources = [
        ProjectListResource::class,
        ProjectSummaryResource::class,
    ];

    /**
     * Plantillas de prompts asistidos para planificación y auditoría.
     */
    protected array $prompts = [
        PlanSprintPrompt::class,
        ProjectHealthReviewPrompt::class,
    ];
}
