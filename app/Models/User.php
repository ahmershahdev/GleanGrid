<?php

namespace App\Models;

use App\Support\Settings;
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
            'anonymized_at' => 'datetime',
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

    public function recentNoShows(): int
    {
        return $this->orders()->where('status', 'no_show')
            ->where('no_show_at', '>=', now()->subDays(Settings::get('no_show_window_days')))
            ->count();
    }

    public function preorderRestricted(): bool
    {
        return $this->isCustomer() && $this->recentNoShows() >= Settings::get('no_show_limit');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isDemo(): bool
    {
        return str_ends_with(strtolower((string) $this->email), '@'.config('gleangrid.demo_domain'));
    }

    public function hasVerifiedEmail(): bool
    {
        return $this->isDemo() || parent::hasVerifiedEmail();
    }

    public function routeNotificationForMail(): ?string
    {
        return $this->isDemo() ? null : $this->email;
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

    public function familyMembers(): HasMany
    {
        return $this->hasMany(FamilyLink::class, 'owner_id');
    }

    public function familyMemberships(): HasMany
    {
        return $this->hasMany(FamilyLink::class, 'member_id');
    }

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
