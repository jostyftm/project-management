<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use App\Traits\HasCacheInvalidation;
use App\Traits\HasSearchable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasCacheInvalidation, HasFactory, HasSearchable, Notifiable;

    /**
     * Patrón de clave de caché para el modelo User.
     * Coincide con el patrón "user_{id}" usado en UserService.
     */
    public function getCacheKeyPattern(): string
    {
        return 'user_{id}';
    }

    /**
     * Etiquetas de caché para invalidación masiva.
     */
    public function getCacheTags(): array
    {
        return ['users'];
    }

    /**
     * Solo invalidar caché cuando atributos relevantes cambian.
     */
    protected function shouldInvalidateCacheOnSave(): bool
    {
        return $this->isDirty(['name', 'email', 'email_verified_at', 'user_auth_id']);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_auth_id',
        'name',
        'email',
        'password',
        'is_instance_admin',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_auth_id' => 'integer',
            'is_instance_admin' => 'boolean',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isInstanceAdmin(): bool
    {
        return (bool) $this->is_instance_admin;
    }

    public function ownedWorkspaces(): HasMany
    {
        return $this->hasMany(Workspace::class, 'owner_id');
    }

    public function workspaceMemberships(): HasMany
    {
        return $this->hasMany(WorkspaceMember::class);
    }

    public function workspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'workspace_members')
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    public function assignedWorkItems(): BelongsToMany
    {
        return $this->belongsToMany(WorkItem::class, 'work_item_assignees');
    }
}
