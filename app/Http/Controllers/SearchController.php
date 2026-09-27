<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class SearchController extends Controller
{
    private const SCOPES = ['all', 'produce', 'farmers', 'markets'];

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => 'nullable|string|max:80',
            'scope' => 'nullable|in:'.implode(',', self::SCOPES),
        ]);

        $term = Str::of($data['q'] ?? '')->squish()->lower()->limit(80, '')->value();
        $scope = $data['scope'] ?? 'all';

        if (mb_strlen($term) < 2) {
            return response()->json(['q' => $term, 'groups' => [], 'suggestion' => null, 'total' => 0]);
        }

        $payload = Cache::remember("search:v1:{$scope}:".md5($term), 60, function () use ($term, $scope) {
            $tokens = array_values(array_filter(explode(' ', $term), fn ($t) => mb_strlen($t) >= 1));

            $groups = array_filter([
                'produce' => in_array($scope, ['all', 'produce'], true) ? $this->products($tokens, $term) : [],
                'categories' => $scope === 'all' ? $this->categories($tokens, $term) : [],
                'farmers' => in_array($scope, ['all', 'farmers'], true) ? $this->farmers($tokens, $term) : [],
                'markets' => in_array($scope, ['all', 'markets'], true) ? $this->markets($tokens, $term) : [],
            ]);

            $total = array_sum(array_map('count', $groups));

            return [
                'q' => $term,
                'groups' => $groups,
                'total' => $total,
                'suggestion' => $total === 0 ? $this->didYouMean($term) : null,
            ];
        });

        return response()->json($payload)->header('Cache-Control', 'private, max-age=30');
    }

    private function products(array $tokens, string $term): array
    {
        $query = Product::listed()->with('farmer:id,stall_name,slug', 'category:id,name,slug');
        foreach ($tokens as $token) {
            $like = $this->like($token);
            $query->where(fn (Builder $w) => $w->where('name', 'like', $like)
                ->orWhere('description', 'like', $like)
                ->orWhereHas('farmer', fn ($f) => $f->where('stall_name', 'like', $like))
                ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $like)));
        }

        return $query->limit(40)->get(['id', 'farmer_profile_id', 'category_id', 'name', 'slug', 'price', 'unit', 'image', 'status', 'stock_quantity', 'rating_avg', 'removed_at'])
            ->map(fn (Product $p) => [
                'type' => 'product',
                'title' => $p->name,
                'url' => route('products.show', $p->slug),
                'image' => $p->image_url,
                'price' => (float) $p->price,
                'unit' => $p->unit,
                'meta' => $p->farmer?->stall_name,
                'category' => $p->category?->slug,
                'available' => $p->isOrderable(),
                'rating' => (float) $p->rating_avg,
                'named' => $this->score($p->name, $term, $tokens) > 0,
                'score' => $this->score($p->name, $term, $tokens) + ($p->isOrderable() ? 8 : 0) + (float) $p->rating_avg,
            ])
            ->pipe(fn (Collection $rows) => $rows->where('named', true)->count() >= 3 ? $rows->where('named', true) : $rows)
            ->sortByDesc('score')->take(6)->values()->map(fn ($r) => collect($r)->except('score', 'named'))->all();
    }

    private function categories(array $tokens, string $term): array
    {
        return Category::where('is_active', true)->get(['id', 'name', 'slug', 'icon', 'color'])
            ->filter(fn ($c) => collect($tokens)->every(fn ($t) => str_contains(Str::lower($c->name), $t)))
            ->map(fn ($c) => [
                'type' => 'category',
                'title' => $c->name,
                'slug' => $c->slug,
                'url' => route('products.index', ['category' => $c->slug]),
                'icon' => $c->icon,
                'color' => $c->color,
                'score' => $this->score($c->name, $term, $tokens),
            ])
            ->sortByDesc('score')->take(3)->values()->map(fn ($r) => collect($r)->except('score'))->all();
    }

    private function farmers(array $tokens, string $term): array
    {
        $query = FarmerProfile::approved();
        foreach ($tokens as $token) {
            $like = $this->like($token);
            $query->where(fn (Builder $w) => $w->where('stall_name', 'like', $like)
                ->orWhere('tagline', 'like', $like)
                ->orWhere('contact_person', 'like', $like)
                ->orWhere('address', 'like', $like));
        }

        return $query->withCount(['products as listed_count' => fn ($q) => $q->whereNull('removed_at')])
            ->limit(20)->get(['id', 'stall_name', 'slug', 'tagline', 'logo', 'rating_avg', 'operating_days'])
            ->map(fn (FarmerProfile $f) => [
                'type' => 'farmer',
                'title' => $f->stall_name,
                'url' => route('farmers.show', $f->slug),
                'image' => $f->logo_url,
                'meta' => $f->tagline,
                'count' => $f->listed_count,
                'rating' => (float) $f->rating_avg,
                'score' => $this->score($f->stall_name, $term, $tokens) + (float) $f->rating_avg,
            ])
            ->sortByDesc('score')->take(4)->values()->map(fn ($r) => collect($r)->except('score'))->all();
    }

    private function markets(array $tokens, string $term): array
    {
        $query = Market::active();
        foreach ($tokens as $token) {
            $like = $this->like($token);
            $query->where(fn (Builder $w) => $w->where('name', 'like', $like)
                ->orWhere('address', 'like', $like)
                ->orWhere('city', 'like', $like));
        }

        return $query->limit(20)->get()
            ->map(fn (Market $m) => [
                'type' => 'market',
                'title' => $m->name,
                'url' => route('markets.show', $m->slug),
                'meta' => $m->address,
                'open_today' => $m->isOpenToday(),
                'hours' => $m->opens_at && $m->closes_at ? substr($m->opens_at, 0, 5).'–'.substr($m->closes_at, 0, 5) : null,
                'score' => $this->score($m->name, $term, $tokens) + ($m->isOpenToday() ? 5 : 0),
            ])
            ->sortByDesc('score')->take(4)->values()->map(fn ($r) => collect($r)->except('score'))->all();
    }

    private function score(string $name, string $term, array $tokens): float
    {
        $name = Str::lower($name);
        $score = match (true) {
            $name === $term => 100,
            str_starts_with($name, $term) => 70,
            (bool) preg_match('/\b'.preg_quote($term, '/').'/u', $name) => 50,
            str_contains($name, $term) => 30,
            default => 0,
        };

        foreach ($tokens as $token) {
            if (preg_match('/\b'.preg_quote($token, '/').'/u', $name)) {
                $score += 10;
            } elseif (str_contains($name, $token)) {
                $score += 4;
            }
        }

        return $score;
    }

    private function didYouMean(string $term): ?string
    {
        $vocabulary = Cache::remember('search:vocabulary', 600, fn () => $this->vocabulary());

        $best = null;
        $bestDistance = PHP_INT_MAX;
        foreach ($vocabulary as $word) {
            $distance = levenshtein($term, $word);
            if ($distance < $bestDistance) {
                [$best, $bestDistance] = [$word, $distance];
            }
        }

        return $best !== null && $bestDistance > 0 && $bestDistance <= max(1, intdiv(mb_strlen($term), 4) + 1) ? $best : null;
    }

    private function vocabulary(): array
    {
        $names = Product::listed()->pluck('name')
            ->merge(Category::pluck('name'))
            ->merge(FarmerProfile::approved()->pluck('stall_name'))
            ->merge(Market::active()->pluck('name'));

        return $names->flatMap(fn ($n) => [Str::lower($n), ...preg_split('/[^\pL]+/u', Str::lower($n), -1, PREG_SPLIT_NO_EMPTY)])
            ->filter(fn ($w) => mb_strlen($w) >= 3)
            ->unique()->values()->all();
    }

    private function like(string $token): string
    {
        return '%'.addcslashes($token, '%_\\').'%';
    }
}
