<?php

use App\Models\Page;
use App\Models\Project;
use App\Models\User;
use App\Models\Webhook;
use App\Models\WorkItem;
use App\Models\Workspace;

beforeEach(function () {
    $this->user = User::factory()->create(['name' => 'Alice']);
    $this->otherUser = User::factory()->create(['name' => 'Bob']);

    $this->workspace = Workspace::create([
        'name' => 'Collab Workspace',
        'slug' => 'collab-workspace',
        'owner_id' => $this->user->id,
    ]);

    // Attach both users to workspace
    $this->workspace->members()->attach($this->user->id, ['role' => 'OWNER']);
    $this->workspace->members()->attach($this->otherUser->id, ['role' => 'MEMBER']);

    $this->project = Project::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Collab Project',
        'identifier' => 'COL',
        'created_by' => $this->user->id,
    ]);

    $this->state = \App\Models\State::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'name' => 'To Do',
        'group' => 'UNSTARTED',
        'is_default' => true,
        'sequence' => 1,
    ]);

    $this->workItem = WorkItem::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'state_id' => $this->state->id,
        'sequence_id' => 1,
        'title' => 'Feature Collaboration',
        'priority' => 'HIGH',
        'created_by' => $this->user->id,
    ]);

    $this->page = Page::create([
        'workspace_id' => $this->workspace->id,
        'project_id' => $this->project->id,
        'title' => 'Project Wiki Guide',
        'created_by' => $this->user->id,
    ]);
});

test('it creates a comment on a work item, logs activity and notifies mentioned users', function () {
    $headers = [
        'X-Workspace-Id' => $this->workspace->id,
    ];

    $response = $this->actingAs($this->user)
        ->withHeaders($headers)
        ->postJson('/api/v1/comments', [
            'work_item_id' => $this->workItem->id,
            'content' => "Hey @{$this->otherUser->name}, please review this task implementation!",
            'mentioned_user_ids' => [$this->otherUser->id],
        ]);

    $response->assertCreated();
    $commentId = $response->json('data.id');

    // 1. Verify comment created
    $this->assertDatabaseHas('comments', [
        'id' => $commentId,
        'work_item_id' => $this->workItem->id,
        'user_id' => $this->user->id,
    ]);

    // 2. Verify Activity was logged
    $this->assertDatabaseHas('activities', [
        'workspace_id' => $this->workspace->id,
        'entity_type' => 'WORK_ITEM',
        'entity_id' => $this->workItem->id,
        'action' => 'COMMENTED',
    ]);

    // 3. Verify notification created for Bob
    $this->assertDatabaseHas('notifications', [
        'workspace_id' => $this->workspace->id,
        'recipient_id' => $this->otherUser->id,
        'type' => 'MENTION',
        'is_read' => false,
    ]);
});

test('it creates a comment on a page and retrieves comments', function () {
    $headers = [
        'X-Workspace-Id' => $this->workspace->id,
    ];

    // Bob comments on Alice's page
    $response = $this->actingAs($this->otherUser)
        ->withHeaders($headers)
        ->postJson('/api/v1/comments', [
            'page_id' => $this->page->id,
            'content' => 'Great documentation page!',
        ]);

    $response->assertCreated();

    // Verify Alice (page author) received notification
    $this->assertDatabaseHas('notifications', [
        'workspace_id' => $this->workspace->id,
        'recipient_id' => $this->user->id,
        'type' => 'COMMENT',
        'is_read' => false,
    ]);

    // List comments by page
    $listResp = $this->actingAs($this->user)
        ->withHeaders($headers)
        ->getJson("/api/v1/pages/{$this->page->id}/comments");

    $listResp->assertOk()
        ->assertJsonCount(1, 'data');
});

test('it lists unread notifications and marks single or all as read', function () {
    $headers = [
        'X-Workspace-Id' => $this->workspace->id,
    ];

    // Create 2 notifications for Bob
    $this->actingAs($this->user)
        ->withHeaders($headers)
        ->postJson('/api/v1/comments', [
            'work_item_id' => $this->workItem->id,
            'content' => "Hey @{$this->otherUser->name} first ping",
            'mentioned_user_ids' => [$this->otherUser->id],
        ]);

    $this->actingAs($this->user)
        ->withHeaders($headers)
        ->postJson('/api/v1/comments', [
            'work_item_id' => $this->workItem->id,
            'content' => "Hey @{$this->otherUser->name} second ping",
            'mentioned_user_ids' => [$this->otherUser->id],
        ]);

    // Bob checks unread count
    $countResp = $this->actingAs($this->otherUser)
        ->withHeaders($headers)
        ->getJson('/api/v1/notifications/unread-count');

    $countResp->assertOk()
        ->assertJson(['unread_count' => 2]);

    // Bob lists notifications
    $listResp = $this->actingAs($this->otherUser)
        ->withHeaders($headers)
        ->getJson('/api/v1/notifications');

    $listResp->assertOk()
        ->assertJsonCount(2, 'data');

    $firstId = $listResp->json('data.0.id');

    // Bob marks one as read
    $readResp = $this->actingAs($this->otherUser)
        ->withHeaders($headers)
        ->postJson("/api/v1/notifications/{$firstId}/read");

    $readResp->assertOk()
        ->assertJsonPath('data.attributes.is_read', true);

    // Bob marks all remaining as read
    $markAllResp = $this->actingAs($this->otherUser)
        ->withHeaders($headers)
        ->postJson('/api/v1/notifications/read-all');

    $markAllResp->assertOk();

    // Verify unread count is now 0
    $finalCount = $this->actingAs($this->otherUser)
        ->withHeaders($headers)
        ->getJson('/api/v1/notifications/unread-count');

    $finalCount->assertOk()
        ->assertJson(['unread_count' => 0]);
});

test('it retrieves activities for a work item and project', function () {
    $headers = [
        'X-Workspace-Id' => $this->workspace->id,
    ];

    // Post a comment to generate an activity
    $this->actingAs($this->user)
        ->withHeaders($headers)
        ->postJson('/api/v1/comments', [
            'work_item_id' => $this->workItem->id,
            'content' => 'Activity test comment',
        ]);

    // Get activities by work item
    $itemActivitiesResp = $this->actingAs($this->user)
        ->withHeaders($headers)
        ->getJson("/api/v1/work-items/{$this->workItem->id}/activities");

    $itemActivitiesResp->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.action', 'COMMENTED');

    // Get activities by project
    $projectActivitiesResp = $this->actingAs($this->user)
        ->withHeaders($headers)
        ->getJson("/api/v1/projects/{$this->project->id}/activities");

    $projectActivitiesResp->assertOk()
        ->assertJsonCount(1, 'data');
});

test('it manages webhooks for workspace', function () {
    $headers = [
        'X-Workspace-Id' => $this->workspace->id,
    ];

    $createResp = $this->actingAs($this->user)
        ->withHeaders($headers)
        ->postJson('/api/v1/webhooks', [
            'url' => 'https://example.com/plane-webhook',
            'secret_token' => 'whsec_12345678',
            'events_subscribed' => ['work_item.created', 'release.published'],
        ]);

    $createResp->assertCreated();
    $webhookId = $createResp->json('data.id');

    $this->assertDatabaseHas('webhooks', [
        'id' => $webhookId,
        'workspace_id' => $this->workspace->id,
        'url' => 'https://example.com/plane-webhook',
    ]);

    // List webhooks
    $listResp = $this->actingAs($this->user)
        ->withHeaders($headers)
        ->getJson('/api/v1/webhooks');

    $listResp->assertOk()
        ->assertJsonCount(1, 'data');

    // Delete webhook
    $delResp = $this->actingAs($this->user)
        ->withHeaders($headers)
        ->deleteJson("/api/v1/webhooks/{$webhookId}");

    $delResp->assertNoContent();
    $this->assertDatabaseMissing('webhooks', ['id' => $webhookId]);
});

test('it streams server-sent events for live collaboration', function () {
    $headers = [
        'X-Workspace-Id' => $this->workspace->id,
    ];

    $response = $this->actingAs($this->user)
        ->withHeaders($headers)
        ->get('/api/v1/live-stream');

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('text/event-stream');
});
