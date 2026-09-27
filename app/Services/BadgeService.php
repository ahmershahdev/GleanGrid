<?php

namespace App\Services;

use App\Models\FarmerBadge;
use App\Models\FarmerProfile;
use App\Models\Order;
use App\Notifications\PlatformNotification;
use App\Support\Settings;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BadgeService
{
    public const WINDOW_DAYS = 90;

    public function rules(): array
    {
        $s = Settings::all();

        return [
            'prior_weight' => $s['badge_prior_weight'],
            'top_rated_min_score' => $s['badge_top_rated_min_score'],
            'top_rated_min_reviews' => $s['badge_top_rated_min_reviews'],
            'reliable_min_orders' => $s['badge_reliable_min_orders'],
            'reliable_min_rate' => $s['badge_reliable_min_rate'],
            'rising_days' => $s['badge_rising_days'],
            'rising_min_rating' => 4.5,
            'rising_min_reviews' => 3,
            'favourite_min' => $s['badge_favourite_min'],
            'window_days' => self::WINDOW_DAYS,
        ];
    }

    public function metrics(?Collection $farmers = null): Collection
    {
        $farmers ??= FarmerProfile::approved()->get(['id', 'stall_name', 'slug', 'approved_at', 'created_at', 'logo']);
        $ids = $farmers->pluck('id');
        if ($ids->isEmpty()) {
            return collect();
        }

        $reviews = DB::table('reviews')
            ->leftJoin('products', fn ($j) => $j->on('products.id', '=', 'reviews.reviewable_id')->where('reviews.reviewable_type', 'product'))
            ->where('reviews.is_hidden', false)
            ->selectRaw("CASE WHEN reviews.reviewable_type = 'farmer' THEN reviews.reviewable_id ELSE products.farmer_profile_id END AS farmer_id")
            ->selectRaw('AVG(reviews.rating) AS avg_rating, COUNT(*) AS review_count')
            ->where(fn ($q) => $q->where('reviews.reviewable_type', 'farmer')->orWhereNotNull('products.farmer_profile_id'))
            ->groupBy('farmer_id')->get()->keyBy('farmer_id');

        $globalMean = (float) (DB::table('reviews')->where('is_hidden', false)->avg('rating') ?: 4.0);

        $orders = Order::whereIn('farmer_profile_id', $ids)->where('created_at', '>=', now()->subDays(self::WINDOW_DAYS))
            ->selectRaw("farmer_profile_id, SUM(status = 'completed') AS completed, SUM(status = 'declined') AS declined")
            ->groupBy('farmer_profile_id')->get()->keyBy('farmer_profile_id');

        $favourites = DB::table('favorites')->where('favoritable_type', 'farmer')->whereIn('favoritable_id', $ids)
            ->selectRaw('favoritable_id, COUNT(*) AS c')->groupBy('favoritable_id')->pluck('c', 'favoritable_id');

        $m = $this->rules()['prior_weight'];

        return $farmers->map(function (FarmerProfile $f) use ($reviews, $orders, $favourites, $globalMean, $m) {
            $r = $reviews->get($f->id);
            $v = (int) ($r->review_count ?? 0);
            $avg = $v ? (float) $r->avg_rating : 0.0;
            $completed = (int) ($orders->get($f->id)->completed ?? 0);
            $declined = (int) ($orders->get($f->id)->declined ?? 0);
            $handled = $completed + $declined;

            return [
                'farmer_profile_id' => $f->id,
                'stall_name' => $f->stall_name,
                'slug' => $f->slug,
                'logo_url' => $f->logo_url,
                'since' => ($f->approved_at ?? $f->created_at)?->toDateString(),
                'reviews' => $v,
                'average' => round($avg, 2),
                'score' => round($v + $m > 0 ? ($v / ($v + $m)) * $avg + ($m / ($v + $m)) * $globalMean : 0, 2),
                'completed' => $completed,
                'declined' => $declined,
                'fulfilment' => $handled ? round($completed / $handled * 100, 1) : null,
                'favourites' => (int) ($favourites[$f->id] ?? 0),
                'global_mean' => round($globalMean, 2),
            ];
        })->keyBy('farmer_profile_id');
    }

    public function earned(array $m, FarmerProfile $farmer): array
    {
        $r = $this->rules();
        $since = $farmer->approved_at ?? $farmer->created_at;

        return array_keys(array_filter([
            'top_rated' => $m['reviews'] >= $r['top_rated_min_reviews'] && $m['score'] >= $r['top_rated_min_score'],
            'reliable' => $m['completed'] >= $r['reliable_min_orders'] && ($m['fulfilment'] ?? 0) >= $r['reliable_min_rate'],
            'rising_star' => $since && $since->gte(now()->subDays($r['rising_days']))
                && $m['reviews'] >= $r['rising_min_reviews'] && $m['average'] >= $r['rising_min_rating'],
            'customer_favourite' => $m['favourites'] >= $r['favourite_min'],
        ]));
    }

    public function recompute(?FarmerProfile $only = null): array
    {
        $farmers = $only ? collect([$only]) : FarmerProfile::approved()->get();
        $metrics = $this->metrics($farmers);
        $summary = ['awarded' => 0, 'revoked' => 0, 'kept' => 0];

        foreach ($farmers as $farmer) {
            $m = $metrics->get($farmer->id);
            $earned = $this->earned($m, $farmer);

            DB::transaction(function () use ($farmer, $m, $earned, &$summary) {
                $existing = FarmerBadge::where('farmer_profile_id', $farmer->id)->lockForUpdate()->get()->keyBy('badge');

                foreach (FarmerBadge::BADGES as $badge) {
                    $record = $existing->get($badge);
                    if ($record?->locked) {
                        continue;
                    }
                    $has = $record && ! $record->revoked_at;
                    $wins = in_array($badge, $earned, true);

                    if ($wins && ! $has) {
                        FarmerBadge::updateOrCreate(
                            ['farmer_profile_id' => $farmer->id, 'badge' => $badge],
                            ['source' => 'auto', 'metrics' => $m, 'awarded_at' => now(), 'revoked_at' => null, 'revoked_by' => null, 'awarded_by' => null, 'reason' => null],
                        );
                        $summary['awarded']++;
                        $farmer->loadMissing('user');
                        $farmer->user?->notify(new PlatformNotification('badge_awarded', ['badge' => $badge], route('farmer.dashboard'), true));
                    } elseif ($wins) {
                        $record->update(['metrics' => $m]);
                        $summary['kept']++;
                    } elseif ($has) {
                        $record->update(['revoked_at' => now(), 'metrics' => $m, 'reason' => 'No longer meets the criteria.']);
                        $summary['revoked']++;
                    }
                }
            });
        }

        FarmerBadge::whereNull('revoked_at')->where('locked', false)
            ->whereDoesntHave('farmer', fn ($q) => $q->approved())
            ->update(['revoked_at' => now(), 'reason' => 'Stall is no longer active.']);

        return $summary;
    }

    public static function forFarmers(iterable $ids): Collection
    {
        return FarmerBadge::active()->whereIn('farmer_profile_id', collect($ids)->all())
            ->orderByRaw("FIELD(badge, 'top_rated', 'reliable', 'customer_favourite', 'rising_star')")
            ->get(['farmer_profile_id', 'badge'])
            ->groupBy('farmer_profile_id')->map(fn ($g) => $g->pluck('badge')->values());
    }
}
