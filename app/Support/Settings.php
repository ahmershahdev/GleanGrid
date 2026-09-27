<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class Settings
{
    public const SCHEMA = [
        'no_show_limit' => [3, 'int', 1, 20],
        'no_show_window_days' => [60, 'int', 7, 365],
        'reminder_hour' => [18, 'int', 0, 23],
        'customer_registration_open' => [true, 'bool'],
        'farmer_registration_open' => [true, 'bool'],
        'max_open_orders_per_customer' => [20, 'int', 1, 200],
        'payments_cash_enabled' => [true, 'bool'],
        'payments_easypaisa_enabled' => [true, 'bool'],
        'payments_jazzcash_enabled' => [true, 'bool'],
        'payments_card_enabled' => [true, 'bool'],
        'payment_window_minutes' => [20, 'int', 5, 120],
        'badge_prior_weight' => [5, 'int', 0, 50],
        'badge_top_rated_min_score' => [4.5, 'float', 3, 5],
        'badge_top_rated_min_reviews' => [5, 'int', 1, 500],
        'badge_reliable_min_orders' => [10, 'int', 1, 1000],
        'badge_reliable_min_rate' => [95, 'int', 50, 100],
        'badge_rising_days' => [120, 'int', 7, 730],
        'badge_favourite_min' => [10, 'int', 1, 10000],
    ];

    public static function all(): array
    {
        $stored = Cache::remember('gg.settings', 60, fn () => DB::table('settings')->pluck('value', 'key')->all());

        return collect(self::SCHEMA)->mapWithKeys(fn ($spec, $key) => [$key => self::cast($stored[$key] ?? $spec[0], $spec[1])])->all();
    }

    public static function get(string $key): mixed
    {
        return self::all()[$key] ?? null;
    }

    public static function put(array $values, ?int $userId = null): void
    {
        foreach ($values as $key => $value) {
            if (! isset(self::SCHEMA[$key])) {
                continue;
            }
            DB::table('settings')->updateOrInsert(['key' => $key], [
                'value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value,
                'updated_by' => $userId,
                'updated_at' => now(),
                'created_at' => now(),
            ]);
        }
        Cache::forget('gg.settings');
    }

    public static function rules(?string $prefix = null, bool $except = false): array
    {
        return collect(self::SCHEMA)
            ->filter(fn ($spec, $key) => $prefix === null || str_starts_with($key, $prefix) !== $except)
            ->map(fn ($spec) => match ($spec[1]) {
                'bool' => ['required', 'boolean'],
                'float' => ['required', 'numeric', "min:{$spec[2]}", "max:{$spec[3]}"],
                default => ['required', 'integer', "min:{$spec[2]}", "max:{$spec[3]}"],
            })->all();
    }

    private static function cast(mixed $value, string $type): mixed
    {
        return match ($type) {
            'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'float' => round((float) $value, 2),
            default => (int) $value,
        };
    }
}
