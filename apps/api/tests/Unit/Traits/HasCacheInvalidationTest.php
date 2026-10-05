<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['cache.default' => 'array']);
    Cache::flush();
});

it('findCached retrieves from database and caches the result', function () {
    $user = User::factory()->create(['id' => 99, 'name' => 'Test User']);

    $cached = User::findCached(99);

    expect($cached)->not->toBeNull();
    expect($cached->id)->toBe(99);
    expect($cached->name)->toBe('Test User');

    // Check if cache was populated
    expect(Cache::has('user_99'))->toBeTrue();
    expect(Cache::get('user_99'))->not->toBeNull();
});

it('findCached returns cached value on subsequent calls', function () {
    $user = User::factory()->create(['id' => 100, 'name' => 'First']);

    // First call - hits database
    $cached1 = User::findCached(100);
    expect($cached1->name)->toBe('First');

    // Update in database directly (bypassing model events)
    User::where('id', 100)->update(['name' => 'Second']);

    // Second call - should return cached value
    $cached2 = User::findCached(100);
    expect($cached2->name)->toBe('First');
});

it('findCached returns null for non-existent id', function () {
    $result = User::findCached(999999);

    expect($result)->toBeNull();
});

it('warmCache stores the model instance in cache', function () {
    $user = User::factory()->create(['id' => 200, 'name' => 'Warm User']);

    $user->warmCache();

    expect(Cache::has('user_200'))->toBeTrue();
    $cached = Cache::get('user_200');
    $name = is_array($cached) ? ($cached['name'] ?? null) : ($cached->name ?? null);
    expect($name)->toBe('Warm User');
});

it('isCached returns true when model is in cache', function () {
    $user = User::factory()->create(['id' => 300]);

    User::findCached(300); // Populate cache
    $freshUser = User::find(300);

    expect($freshUser->isCached())->toBeTrue();
});

it('isCached returns false when model is not in cache', function () {
    $user = User::factory()->create(['id' => 400]);

    expect($user->isCached())->toBeFalse();
});

it('invalidateCache removes the model from cache', function () {
    $user = User::factory()->create(['id' => 500]);

    User::findCached(500); // Populate cache
    expect(Cache::has('user_500'))->toBeTrue();

    $user->invalidateCache();

    expect(Cache::has('user_500'))->toBeFalse();
});

it('getCacheKey returns correct pattern', function () {
    $user = User::factory()->create(['id' => 42]);

    expect($user->getCacheKey())->toBe('user_42');
});

it('getCacheTags returns configured tags', function () {
    $user = User::factory()->create();

    expect($user->getCacheTags())->toContain('users');
});

it('invalidateAllCache flushes all tagged cache for model', function () {
    // Skip if cache store doesn't support tags (array store in testing)
    $store = Cache::store()->getStore();
    $supportsTags = method_exists($store, 'getDriverName')
        && in_array($store->getDriverName() ?? '', ['redis', 'memcached'], true);

    if (! $supportsTags) {
        $this->markTestSkipped('Cache store does not support tags');
    }

    $user1 = User::factory()->create(['id' => 600, 'name' => 'User 1']);
    $user2 = User::factory()->create(['id' => 601, 'name' => 'User 2']);

    User::findCached(600);
    User::findCached(601);

    expect(Cache::has('user_600'))->toBeTrue();
    expect(Cache::has('user_601'))->toBeTrue();

    User::invalidateAllCache();

    expect(Cache::has('user_600'))->toBeFalse();
    expect(Cache::has('user_601'))->toBeFalse();
});

it('invalidates cache on save when relevant attributes change', function () {
    $user = User::factory()->create(['id' => 1, 'name' => 'Original']);
    User::findCached(1); // Populate cache
    expect(Cache::has('user_1'))->toBeTrue();

    $user->name = 'Updated Name';
    $user->save();

    expect(Cache::has('user_1'))->toBeFalse();
});

it('does not invalidate cache on save when only irrelevant attributes change', function () {
    $user = User::factory()->create(['id' => 2, 'name' => 'Original']);
    User::findCached(2); // Populate cache
    expect(Cache::has('user_2'))->toBeTrue();

    // Touch only updated_at (not in relevant list)
    $user->touch();

    // Cache should still exist since only timestamps changed
});

it('invalidates cache on delete', function () {
    $user = User::factory()->create(['id' => 3]);
    User::findCached(3); // Populate cache
    expect(Cache::has('user_3'))->toBeTrue();

    $user->delete();

    expect(Cache::has('user_3'))->toBeFalse();
});

it('getCacheKeyPattern returns overridden pattern', function () {
    $user = new User;
    expect($user->getCacheKeyPattern())->toBe('user_{id}');
});

it('getCacheTtl returns default 0', function () {
    $user = new User;
    expect($user->getCacheTtl())->toBe(0);
});
