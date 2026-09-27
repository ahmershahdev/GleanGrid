<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PickupSlot extends Model
{
    protected $fillable = ['farmer_profile_id', 'market_id', 'day_of_week', 'starts_at', 'ends_at', 'capacity', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'day_of_week' => 'integer', 'capacity' => 'integer'];
    }

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(FarmerProfile::class, 'farmer_profile_id');
    }

    public function market(): BelongsTo
    {
        return $this->belongsTo(Market::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function startsOn(string $date): CarbonImmutable
    {
        return CarbonImmutable::parse($date.' '.$this->starts_at);
    }

    public function upcomingDates(int $cutoffHours, int $weeks = 3): array
    {
        $dates = [];
        $today = CarbonImmutable::today();
        for ($i = 0; $i < 7 * $weeks; $i++) {
            $day = $today->addDays($i);
            if ($day->dayOfWeek === $this->day_of_week
                && $this->startsOn($day->toDateString())->subHours($cutoffHours)->isFuture()) {
                $dates[] = $day->toDateString();
            }
        }

        return $dates;
    }
}
