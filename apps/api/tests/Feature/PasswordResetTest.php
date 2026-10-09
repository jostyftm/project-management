<?php

use App\Jobs\SendNotificationEmailJob;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

it('dispatches password reset email and stores hashed token in database', function () {
    Queue::fake();

    $user = User::factory()->create([
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.com',
        'password' => Hash::make('OldPassword123!'),
    ]);

    $response = $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'ada@example.com',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 200)
        ->assertJsonStructure(['status', 'data' => ['message']]);

    // Token stored in database
    $record = DB::table('password_reset_tokens')->where('email', 'ada@example.com')->first();
    expect($record)->not->toBeNull();
    expect($record->token)->toBeString();
    expect(strlen($record->token))->toBe(64); // SHA-256 length

    // Email job dispatched with ResetPasswordMail
    Queue::assertPushed(SendNotificationEmailJob::class, function ($job) use ($user) {
        return $job->recipientEmail === $user->email && $job->mailable instanceof ResetPasswordMail;
    });
});

it('returns generic success response even when email is not registered', function () {
    Queue::fake();

    $response = $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'unknown@example.com',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 200);

    // No token created and no job dispatched
    expect(DB::table('password_reset_tokens')->where('email', 'unknown@example.com')->exists())->toBeFalse();
    Queue::assertNothingPushed();
});

it('resets user password successfully with valid signed token within 10 minutes', function () {
    $user = User::factory()->create([
        'email' => 'grace@hopper.local',
        'password' => Hash::make('OldPassword123!'),
    ]);

    $plainToken = Str::random(64);
    $hashedToken = hash('sha256', $plainToken);

    DB::table('password_reset_tokens')->insert([
        'email' => 'grace@hopper.local',
        'token' => $hashedToken,
        'created_at' => now()->subMinutes(5), // 5 minutes old (well within 10 min window)
    ]);

    $response = $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'grace@hopper.local',
        'token' => $plainToken,
        'password' => 'NewSecurePassword123!',
        'password_confirmation' => 'NewSecurePassword123!',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 200);

    // Password updated in database
    $user->refresh();
    expect(Hash::check('NewSecurePassword123!', $user->password))->toBeTrue();

    // Reset token consumed and deleted
    expect(DB::table('password_reset_tokens')->where('email', 'grace@hopper.local')->exists())->toBeFalse();
});

it('rejects password reset if the token is older than 10 minutes', function () {
    $user = User::factory()->create([
        'email' => 'alan@turing.local',
        'password' => Hash::make('OldPassword123!'),
    ]);

    $plainToken = Str::random(64);
    $hashedToken = hash('sha256', $plainToken);

    DB::table('password_reset_tokens')->insert([
        'email' => 'alan@turing.local',
        'token' => $hashedToken,
        'created_at' => now()->subMinutes(11), // 11 minutes old (> 10 minutes)
    ]);

    $response = $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'alan@turing.local',
        'token' => $plainToken,
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['token']);

    // Password remains unchanged
    $user->refresh();
    expect(Hash::check('OldPassword123!', $user->password))->toBeTrue();

    // Expired token was purged
    expect(DB::table('password_reset_tokens')->where('email', 'alan@turing.local')->exists())->toBeFalse();
});

it('rejects password reset if token is invalid or tampered with', function () {
    $user = User::factory()->create([
        'email' => 'margaret@hamilton.local',
        'password' => Hash::make('OldPassword123!'),
    ]);

    $plainToken = Str::random(64);
    $hashedToken = hash('sha256', $plainToken);

    DB::table('password_reset_tokens')->insert([
        'email' => 'margaret@hamilton.local',
        'token' => $hashedToken,
        'created_at' => now()->subMinutes(2),
    ]);

    $response = $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'margaret@hamilton.local',
        'token' => 'invalid-tampered-token-value',
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['token']);

    // Password remains unchanged
    $user->refresh();
    expect(Hash::check('OldPassword123!', $user->password))->toBeTrue();
});
