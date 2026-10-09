<?php

use App\Models\User;

it('registers a new user and automatically creates their default workspace', function () {
    $payload = [
        'name' => 'Ada Lovelace',
        'email' => 'ada@lovelace.local',
        'password' => 'Password123!',
        'workspace_name' => 'Ada Systems',
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'status',
            'data' => [
                'token',
                'user' => ['id', 'name', 'email'],
                'current_workspace' => ['id', 'name', 'slug'],
            ],
        ]);

    $this->assertDatabaseHas('users', ['email' => 'ada@lovelace.local']);
    $this->assertDatabaseHas('workspaces', ['name' => 'Ada Systems']);
});

it('logs in an existing user with valid credentials', function () {
    $user = User::factory()->create([
        'email' => 'charles@babbage.local',
        'password' => bcrypt('Engine123!'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'charles@babbage.local',
        'password' => 'Engine123!',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'status',
            'data' => ['token', 'user'],
        ]);
});

it('fails login with invalid password', function () {
    $user = User::factory()->create([
        'email' => 'test@fail.local',
        'password' => bcrypt('CorrectPassword123!'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'test@fail.local',
        'password' => 'WrongPassword',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

it('retrieves the authenticated user profile via auth/me', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(200)
        ->assertJsonPath('data.user.id', $user->id)
        ->assertJsonPath('data.user.email', $user->email);
});
