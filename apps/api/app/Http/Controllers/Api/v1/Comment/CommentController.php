<?php

namespace App\Http\Controllers\Api\v1\Comment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comment\CommentCreateRequest;
use App\Http\Resources\Comment\CommentResource;
use App\Services\CommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommentController extends Controller
{
    public function __construct(
        protected CommentService $commentService
    ) {}

    public function indexByWorkItem(Request $request, string|int $workItemId): AnonymousResourceCollection
    {
        $comments = $this->commentService->listForWorkItem($workItemId);
        return CommentResource::collection($comments);
    }

    public function indexByPage(Request $request, string|int $pageId): AnonymousResourceCollection
    {
        $comments = $this->commentService->listForPage($pageId);
        return CommentResource::collection($comments);
    }

    public function store(CommentCreateRequest $request): CommentResource
    {
        $data = $request->validated();
        $data['workspace_id'] = $request->attributes->get('workspace_id')
            ?? $request->header('X-Workspace-Id')
            ?? (app()->bound('current_workspace_id') ? app('current_workspace_id') : null);
        $author = $request->user();

        $comment = $this->commentService->createComment($data, $author);

        return new CommentResource($comment);
    }

    public function destroy(Request $request, string|int $id): JsonResponse
    {
        $this->commentService->deleteComment($id, $request->user());
        return response()->json(null, 204);
    }
}
