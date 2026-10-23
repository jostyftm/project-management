<?php

namespace App\Http\Controllers\Api\v1\Comment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comment\CommentCreateRequest;
use App\Http\Resources\Comment\CommentResource;
use App\Models\Comment;
use App\Services\CommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
        $file = $request->file('attachment') ?? $request->file('image');

        $comment = $this->commentService->createComment($data, $author, $file);

        return new CommentResource($comment);
    }

    public function attachment(Request $request, Comment $comment, int $index): StreamedResponse|JsonResponse
    {
        $attachments = $comment->attachments ?? [];
        if (! isset($attachments[$index])) {
            abort(404, 'Adjunto no encontrado.');
        }

        $att = $attachments[$index];
        $filePath = $att['file_path'] ?? null;
        if (! $filePath) {
            abort(404, 'Ruta de archivo no válida.');
        }

        $diskName = $att['disk'] ?? config('filesystems.default');
        $disk = Storage::disk($diskName);

        if (! $disk->exists($filePath)) {
            abort(404, 'Archivo no encontrado en almacenamiento.');
        }

        $mime = $att['mime'] ?? $disk->mimeType($filePath) ?? 'application/octet-stream';
        $fileName = $att['name'] ?? 'attachment';

        return response()->stream(function () use ($disk, $filePath) {
            $stream = $disk->readStream($filePath);
            if ($stream) {
                fpassthru($stream);
                fclose($stream);
            }
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.$fileName.'"',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function destroy(Request $request, string|int $id): JsonResponse
    {
        $this->commentService->deleteComment($id, $request->user());

        return response()->json(null, 204);
    }
}
