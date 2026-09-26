<?php

namespace App\Http\Controllers\Api\v1\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UserCreateRequest;
use App\Http\Requests\User\UserListRequest;
use App\Http\Requests\User\UserUpdateRequest;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;

class UserController extends Controller
{
    public function __construct(
        private UserService $userService
    ) {}

    /**
     * Display a listing of the resource.
     */
    public function index(UserListRequest $request): AnonymousResourceCollection
    {
        $users = $this->userService->list($request);

        return UserResource::collection($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(UserCreateRequest $request): JsonResource
    {
        $user = $this->userService->save($request);

        return new UserResource($user);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user): JsonResource
    {
        $user = $this->userService->get($user);

        return new UserResource($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserUpdateRequest $request, User $user): JsonResource
    {
        $user = $this->userService->update($request, $user);

        return new UserResource($user);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user): Response
    {
        $this->userService->delete($user);

        return response()->noContent();
    }
}
