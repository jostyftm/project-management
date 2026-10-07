<?php

use App\Http\Middleware\AuthenticateMcpRequest;
use App\Http\Middleware\IdentifyWorkspace;
use App\Mcp\Servers\ProjectManagementServer;
use Laravel\Mcp\Facades\Mcp;

// Servidor local MCP (comunicación stdio por CLI, Cursor, Claude Desktop o Antigravity)
Mcp::local('project-management', ProjectManagementServer::class);

// Servidor web MCP (comunicación HTTP / SSE para agentes remotos, integraciones web y local desde Windows)
Mcp::web('/mcp/project-management', ProjectManagementServer::class)
    ->middleware([AuthenticateMcpRequest::class, IdentifyWorkspace::class]);
