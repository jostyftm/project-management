<?php

namespace App\Services;

use App\Models\Comment;
use App\Models\Page;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CommentService
{
    public function __construct(
        protected NotificationService $notificationService,
        protected ActivityService $activityService
    ) {}

    /**
     * Create a comment on a work item or a page, with automatic mentions parsing and notifications.
     */
    public function createComment(array $data, User $author): Comment
    {
        return DB::transaction(function () use ($data, $author) {
            $workspaceId = $data['workspace_id'];
            $workItemId = $data['work_item_id'] ?? null;
            $pageId = $data['page_id'] ?? null;
            $content = $data['content'];
            $projectId = $data['project_id'] ?? null;

            // Extract mentioned user IDs from explicit array or regex @[id] or @username
            $mentionedUserIds = $data['mentioned_user_ids'] ?? [];

            // If string contains @mention, also lookup user by username or email
            preg_match_all('/@([a-zA-Z0-9_.-]+)/', $content, $matches);
            if (!empty($matches[1])) {
                $matchedHandles = $matches[1];
                $foundUsers = User::query()
                    ->where(function ($q) use ($matchedHandles) {
                        $q->whereIn('name', $matchedHandles)
                          ->orWhereIn('email', $matchedHandles)
                          ->orWhereIn('id', $matchedHandles);
                    })
                    ->pluck('id')
                    ->all();

                $mentionedUserIds = array_unique(array_merge($mentionedUserIds, $foundUsers));
            }

            // Remove author from mentioned list to avoid self-notification
            $mentionedUserIds = array_values(array_filter($mentionedUserIds, fn ($id) => (string) $id !== (string) $author->id));

            $workItem = null;
            if ($workItemId) {
                $workItem = WorkItem::findOrFail($workItemId);
                $projectId = $projectId ?: $workItem->project_id;
            }

            $page = null;
            if ($pageId) {
                $page = Page::findOrFail($pageId);
                $projectId = $projectId ?: $page->project_id;
            }

            $comment = Comment::create([
                'workspace_id' => $workspaceId,
                'project_id' => $projectId,
                'work_item_id' => $workItemId,
                'page_id' => $pageId,
                'user_id' => $author->id,
                'content' => $content,
                'mentioned_user_ids' => $mentionedUserIds,
            ]);

            // Handle Work Item context
            if ($workItem) {
                // 1. Log activity
                $this->activityService->logActivity(
                    $workspaceId,
                    $projectId,
                    $author->id,
                    'WORK_ITEM',
                    $workItem->id,
                    'COMMENTED',
                    [
                        'comment_id' => $comment->id,
                        'preview' => Str::limit($content, 80),
                    ]
                );

                $targetUrl = "/projects/{$projectId}?item={$workItem->id}";

                // 2. Notify assignee or creator if not the author
                $candidateRecipients = array_filter([
                    $workItem->created_by,
                    $workItem->lead_id,
                ], fn ($id) => $id && (string) $id !== (string) $author->id && !in_array($id, $mentionedUserIds));

                foreach (array_unique($candidateRecipients) as $recipientId) {
                    $this->notificationService->sendNotification(
                        $workspaceId,
                        $recipientId,
                        $author->id,
                        'COMMENT',
                        'WORK_ITEM',
                        $workItem->id,
                        "Nuevo comentario en [{$workItem->identifier}] {$workItem->title}",
                        "{$author->name} comentó: \"" . Str::limit($content, 80) . "\"",
                        $targetUrl
                    );
                }

                // 3. Notify mentioned users
                foreach ($mentionedUserIds as $mentionedId) {
                    $this->notificationService->sendNotification(
                        $workspaceId,
                        $mentionedId,
                        $author->id,
                        'MENTION',
                        'WORK_ITEM',
                        $workItem->id,
                        "Te mencionaron en [{$workItem->identifier}] {$workItem->title}",
                        "{$author->name} te mencionó en una discusión: \"" . Str::limit($content, 80) . "\"",
                        $targetUrl
                    );
                }
            }

            // Handle Page context
            if ($page) {
                $targetUrl = "/pages/{$page->id}";

                if ($page->created_by && (string) $page->created_by !== (string) $author->id && !in_array($page->created_by, $mentionedUserIds)) {
                    $this->notificationService->sendNotification(
                        $workspaceId,
                        $page->created_by,
                        $author->id,
                        'COMMENT',
                        'PAGE',
                        $page->id,
                        "Nuevo comentario en la página \"{$page->title}\"",
                        "{$author->name} comentó en tu página: \"" . Str::limit($content, 80) . "\"",
                        $targetUrl
                    );
                }

                // Notify mentioned users
                foreach ($mentionedUserIds as $mentionedId) {
                    $this->notificationService->sendNotification(
                        $workspaceId,
                        $mentionedId,
                        $author->id,
                        'MENTION',
                        'PAGE',
                        $page->id,
                        "Te mencionaron en la página \"{$page->title}\"",
                        "{$author->name} te mencionó: \"" . Str::limit($content, 80) . "\"",
                        $targetUrl
                    );
                }
            }

            return $comment->load(['user']);
        });
    }

    /**
     * List all comments for a work item in chronological order.
     */
    public function listForWorkItem(int|string $workItemId): Collection
    {
        return Comment::query()
            ->where('work_item_id', $workItemId)
            ->with(['user'])
            ->oldest()
            ->get();
    }

    /**
     * List all comments for a page in chronological order.
     */
    public function listForPage(int|string $pageId): Collection
    {
        return Comment::query()
            ->where('page_id', $pageId)
            ->with(['user'])
            ->oldest()
            ->get();
    }

    /**
     * Delete a comment.
     */
    public function deleteComment(int|string $commentId, User $user): void
    {
        $comment = Comment::findOrFail($commentId);

        // Allow deletion if user is author or has administrative role
        if ((string) $comment->user_id !== (string) $user->id) {
            abort(403, 'No tienes permisos para eliminar este comentario.');
        }

        $comment->delete();
    }
}
