<?php

namespace App\Http\Resources\Report;

use Illuminate\Http\Resources\Json\ResourceCollection;

class WorkspaceReportCollection extends ResourceCollection
{
    public $collects = WorkspaceReportResource::class;
}
