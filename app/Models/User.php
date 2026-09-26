<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    public const ROLE_CUSTOMER = 'customer';

    public const ROLE_FARMER = 'farmer';

    public const ROLE_ADMIN = 'admin';

    protected $fillable = [
        'name', 'username', 'email', 'phone', 'address', 'city',
        'role', 'status', 'locale', 'avatar', 'password', 'last_login_at', 'password_changed_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isFarmer(): bool
    {
        return $this->role === self::ROLE_FARMER;
    }

    public function isCustomer(): bool
    {
        return $this->role === self::ROLE_CUSTOMER;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function loginEvents(): HasMany
    {
        return $this->hasMany(LoginEvent::class);
    }

    public function farmerProfile(): HasOne
    {
        return $this->hasOne(FarmerProfile::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class);
    }

    /** Family links where this user is the account owner. */
    public function familyMembers(): HasMany
    {
        return $this->hasMany(FamilyLink::class, 'owner_id');
    }

    /** Family links where this user was invited by someone else. */
    public function familyMemberships(): HasMany
    {
        return $this->hasMany(FamilyLink::class, 'member_id');
    }

    /**
     * IDs of every customer whose orders this user may see: themselves plus
     * accepted family links in either direction.
     */
    public function householdIds(): array
    {
        $owned = $this->familyMembers()->where('status', 'accepted')->pluck('member_id');
        $joined = $this->familyMemberships()->where('status', 'accepted')->pluck('owner_id');

        return $owned->merge($joined)->push($this->id)->unique()->values()->all();
    }

    public function dashboardRoute(): string
    {
        return match ($this->role) {
            self::ROLE_ADMIN => 'admin.dashboard',
            self::ROLE_FARMER => 'farmer.dashboard',
            default => 'customer.dashboard',
        };
    }
}
