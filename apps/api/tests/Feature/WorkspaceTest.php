<?php

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;

it('creates and lists workspaces for authenticated user', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $createResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/workspaces', [
            'name' => 'Acme Corporation',
            'slug' => 'acme-corp',
        ]);

    $createResponse->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'Acme Corporation')
        ->assertJsonPath('data.attributes.slug', 'acme-corp');

    $listResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/workspaces');

    $listResponse->assertStatus(200)
        ->assertJsonFragment(['name' => 'Acme Corporation']);
});

it('adds a new member to an existing workspace', function () {
    $owner = User::factory()->create();
    $token = $owner->createToken('test-token')->plainTextToken;

    $workspace = Workspace::create([
        'name' => 'Design Labs',
        'slug' => 'design-labs',
        'owner_id' => $owner->id,
    ]);

    WorkspaceMember::create([
        'workspace_id' => $workspace->id,
        'user_id' => $owner->id,
        'role' => 'OWNER',
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/workspaces/{$workspace->id}/members", [
            'email' => 'colleague@design.local',
            'role' => 'MEMBER',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.role', 'MEMBER');

    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $workspace->id,
        'role' => 'MEMBER',
    ]);
});
