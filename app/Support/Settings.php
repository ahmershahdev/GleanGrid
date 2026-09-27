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

    public static function rules(): array
    {
        return collect(self::SCHEMA)->map(fn ($spec) => $spec[1] === 'bool' ? ['required', 'boolean'] : ['required', 'integer', "min:{$spec[2]}", "max:{$spec[3]}"])->all();
    }

    private static function cast(mixed $value, string $type): mixed
    {
        return $type === 'bool' ? filter_var($value, FILTER_VALIDATE_BOOLEAN) : (int) $value;
    }
}
