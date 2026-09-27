<?php

namespace App\Support;

use Illuminate\Http\Request;

class PathFilters
{
    public const KEYS = [
        'search' => 'q',
        'category' => 'category',
        'market' => 'market',
        'city' => 'city',
        'near' => 'near',
        'day' => 'day',
        'price' => 'price',
        'status' => 'status',
        'method' => 'method',
        'badge' => 'badge',
        'max-rating' => 'max_rating',
        'action' => 'action',
        'date' => 'date',
        'from' => 'from',
        'to' => 'to',
        'sort' => 'sort',
        'page' => 'page',
    ];

    public const FLAGS = [
        'in-stock' => ['in_stock', '1'],
        'household' => ['household', '1'],
        'removed' => ['removed', '1'],
        'hidden' => ['hidden', '1'],
        'unanswered' => ['filter', 'unanswered'],
    ];

    public const ORDER = ['search', 'category', 'market', 'city', 'near', 'day', 'price', 'in-stock', 'status', 'method', 'badge', 'household', 'removed', 'hidden', 'unanswered', 'max-rating', 'action', 'date', 'from', 'to', 'sort', 'page'];

    public const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    public const SORTS = ['price_asc' => 'price-low', 'price_desc' => 'price-high', 'rating' => 'top-rated', 'name' => 'a-z'];

    public static function pattern(): string
    {
        $words = array_map(fn ($w) => preg_quote($w, '/'), [...array_keys(self::KEYS), ...array_keys(self::FLAGS)]);

        return '(?:'.implode('|', $words).')(?:/.*)?';
    }

    public static function parse(?string $path): ?array
    {
        $segments = array_values(array_filter(explode('/', (string) $path), fn ($s) => $s !== ''));
        $params = [];
        for ($i = 0; $i < count($segments); $i++) {
            $key = strtolower($segments[$i]);
            if (isset(self::FLAGS[$key])) {
                [$param, $value] = self::FLAGS[$key];
                $params[$param] = $value;

                continue;
            }
            if (! isset(self::KEYS[$key]) || ! isset($segments[$i + 1])) {
                return null;
            }
            $value = rawurldecode($segments[++$i]);
            foreach (self::decode($key, $value) as $param => $decoded) {
                $params[$param] = $decoded;
            }
        }

        return $params;
    }

    public static function segments(array $params): string
    {
        $parts = [];
        foreach (self::ORDER as $key) {
            if (isset(self::FLAGS[$key])) {
                [$param, $value] = self::FLAGS[$key];
                if (isset($params[$param]) && (string) $params[$param] === $value) {
                    $parts[] = $key;
                }

                continue;
            }
            $value = self::encode($key, $params);
            if ($value !== null && $value !== '') {
                $parts[] = $key;
                $parts[] = $value;
            }
        }

        return implode('/', $parts);
    }

    public static function url(string $route, array $params = [], array $routeParameters = []): string
    {
        $base = rtrim(route($route, $routeParameters), '/');
        $segments = self::segments($params);

        return $segments === '' ? $base : $base.'/'.$segments;
    }

    public static function canonical(Request $request): string
    {
        $params = $request->attributes->get('path_filters');
        $route = $request->route();
        if (! is_array($params) || ! $route?->getName()) {
            return $request->url();
        }

        return self::url($route->getName(), array_intersect_key($params, ['category' => true]), collect($route->parameters())->except('filters')->all());
    }

    public static function fromQuery(array $query): array
    {
        $known = array_merge(array_values(self::KEYS), array_column(self::FLAGS, 0), ['min', 'max', 'lat', 'lng', 'in_stock']);

        return array_intersect_key($query, array_flip($known));
    }

    private static function decode(string $key, string $value): array
    {
        return match ($key) {
            'search' => ['q' => trim(preg_replace('/\s+/', ' ', str_replace('-', ' ', $value)))],
            'day' => ['day' => (string) (array_search(strtolower($value), self::DAYS, true) !== false ? array_search(strtolower($value), self::DAYS, true) : $value)],
            'sort' => ['sort' => array_search($value, self::SORTS, true) ?: str_replace('-', '_', $value)],
            'status' => ['status' => str_replace('-', '_', $value)],
            'price' => self::decodePrice($value),
            'near' => self::decodeNear($value),
            default => [self::KEYS[$key] => $value],
        };
    }

    private static function encode(string $key, array $params): ?string
    {
        return match ($key) {
            'search' => isset($params['q']) ? self::slugText((string) $params['q']) : null,
            'day' => isset($params['day']) && $params['day'] !== '' ? (self::DAYS[(int) $params['day']] ?? null) : null,
            'sort' => isset($params['sort']) && $params['sort'] !== 'featured' ? (self::SORTS[$params['sort']] ?? str_replace('_', '-', (string) $params['sort'])) : null,
            'status' => isset($params['status']) ? str_replace('_', '-', (string) $params['status']) : null,
            'price' => self::encodePrice($params['min'] ?? null, $params['max'] ?? null),
            'near' => isset($params['lat'], $params['lng']) ? round((float) $params['lat'], 4).','.round((float) $params['lng'], 4) : null,
            'page' => isset($params['page']) && (int) $params['page'] > 1 ? (string) (int) $params['page'] : null,
            default => isset($params[self::KEYS[$key]]) ? rawurlencode((string) $params[self::KEYS[$key]]) : null,
        };
    }

    private static function slugText(string $text): ?string
    {
        $text = trim(preg_replace('/[\s\/\\\\?#]+/u', ' ', $text));

        return $text === '' ? null : rawurlencode(str_replace(' ', '-', $text));
    }

    private static function encodePrice($min, $max): ?string
    {
        $min = $min === null || $min === '' ? null : (float) $min;
        $max = $max === null || $max === '' ? null : (float) $max;
        if ($min === null && $max === null) {
            return null;
        }
        $fmt = fn (float $n) => rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');

        return ($min === null ? '0' : $fmt($min)).'-'.($max === null ? 'up' : $fmt($max));
    }

    private static function decodePrice(string $value): array
    {
        if (! preg_match('/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?|up)$/', $value, $m)) {
            return ['min' => 'invalid'];
        }

        return array_filter(['min' => (float) $m[1] > 0 ? $m[1] : null, 'max' => $m[2] === 'up' ? null : $m[2]], fn ($v) => $v !== null);
    }

    private static function decodeNear(string $value): array
    {
        [$lat, $lng] = array_pad(explode(',', $value, 2), 2, null);

        return ['lat' => $lat, 'lng' => $lng];
    }
}
