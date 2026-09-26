<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;

class UserService
{
    /**
     * List User
     */
    public function list(Request $request): Collection|AbstractPaginator
    {
        return (new User)->search(
            request: $request,
            filters: ['name', 'email'],
            relationships: [],
        );
    }

    /**
     * Get User
     */
    public function get(User $user): ?User
    {
        return User::findCached($user->id);
    }

    /**
     * Save User
     */
    public function save(Request $request): User
    {
        $data = $request->validated();
        if (isset($data['password'])) {
            $data['password'] = bcrypt($data['password']);
        }
        $user = new User($data);
        $user->save();

        return $user;
    }

    /**
     * Update User
     */
    public function update(Request $request, User $user): User
    {
        $data = $request->validated();
        if (! empty($data['password'])) {
            $data['password'] = bcrypt($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return $user;
    }

    /**
     * Delete User
     */
    public function delete(User $user): void
    {
        $user->delete();
    }
}
