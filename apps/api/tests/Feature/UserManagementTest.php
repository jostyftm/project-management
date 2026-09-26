<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

it('lists users with json:api structure', function () {
    User::factory()->create([
        'user_auth_id' => 10,
        'name' => 'Alice Dev',
        'email' => 'alice@example.com',
    ]);

    $response = $this->getJson('/api/v1/users');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'type',
                    'attributes' => [
                        'user_auth_id',
                        'name',
                        'email',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ],
        ]);
});

it('filters users using HasSearchable query builder', function () {
    User::factory()->create(['name' => 'Carlos Perez', 'email' => 'carlos@example.com']);
    User::factory()->create(['name' => 'Beatriz Lopez', 'email' => 'beatriz@example.com']);

    $response = $this->getJson('/api/v1/users?filter[name]=Carlos');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.name', 'Carlos Perez');
});

it('shows a single user by ID', function () {
    $user = User::factory()->create([
        'name' => 'Single User',
        'email' => 'single@example.com',
    ]);

    $response = $this->getJson("/api/v1/users/{$user->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.attributes.name', 'Single User')
        ->assertJsonPath('data.attributes.email', 'single@example.com');
});

it('creates a new user', function () {
    $payload = [
        'user_auth_id' => 55,
        'name' => 'New User',
        'email' => 'newuser@example.com',
        'password' => 'secret1234',
    ];

    $response = $this->postJson('/api/v1/users', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.attributes.name', 'New User')
        ->assertJsonPath('data.attributes.email', 'newuser@example.com')
        ->assertJsonPath('data.attributes.user_auth_id', 55);

    $this->assertDatabaseHas('users', [
        'email' => 'newuser@example.com',
        'user_auth_id' => 55,
    ]);
});

it('returns 422 validation error when required fields are missing on create', function () {
    $response = $this->postJson('/api/v1/users', [
        'name' => 'Incomplete User',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email', 'password']);
});

it('updates an existing user', function () {
    $user = User::factory()->create([
        'name' => 'Old Name',
        'email' => 'old@example.com',
    ]);

    $response = $this->putJson("/api/v1/users/{$user->id}", [
        'name' => 'Updated Name',
        'email' => 'updated@example.com',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.attributes.name', 'Updated Name')
        ->assertJsonPath('data.attributes.email', 'updated@example.com');

    expect($user->fresh()->name)->toBe('Updated Name');
});

it('deletes a user and returns 204 no content', function () {
    $user = User::factory()->create();

    $response = $this->deleteJson("/api/v1/users/{$user->id}");

    $response->assertStatus(204);
    expect(User::find($user->id))->toBeNull();
});

it('rejects unauthenticated requests when forced without credentials', function () {
    $response = $this->withHeaders([
        'X-Force-Unauthenticated' => 'true',
    ])->getJson('/api/v1/users');

    $response->assertStatus(401);
});

it('resolves user via X-User-Auth-Id header', function () {
    $user = User::factory()->create([
        'user_auth_id' => 888,
        'name' => 'Header User',
    ]);

    $response = $this->withHeaders([
        'X-User-Auth-Id' => '888',
    ])->getJson('/api/v1/users');

    $response->assertStatus(200);
});

it('resolves and provisions user via Bearer token calling sdi_auth_service', function () {
    Http::fake([
        'http://sdi_auth-service/api/v1/me' => Http::response([
            'data' => [
                'id' => 999,
                'attributes' => [
                    'name' => 'Auth Service User',
                    'email' => 'auth_service_user@example.com',
                ],
            ],
        ], 200),
    ]);

    $response = $this->withToken('mock-valid-sdi-token')
        ->getJson('/api/v1/users');

    $response->assertStatus(200);

    $provisioned = User::where('user_auth_id', 999)->first();
    expect($provisioned)->not->toBeNull();
    expect($provisioned->email)->toBe('auth_service_user@example.com');
});
