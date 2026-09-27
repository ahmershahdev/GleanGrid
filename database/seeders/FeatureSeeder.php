<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FarmerProfile;
use App\Models\Favorite;
use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewPhoto;
use App\Models\SeasonalProduce;
use App\Models\User;
use App\Services\BadgeService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FeatureSeeder extends Seeder
{
    public function run(): void
    {
        $this->seasons();
        $this->priceHistory();
        $this->reviewPhotos();
        $this->stallFans();
        app(BadgeService::class)->recompute();
    }

    private const SEASONS = [
        ['Sindhri Mango', 'fruits', 'mango', [5, 6, 7], [6], 'sindhri', 'Sindh’s signature mango — Mirpur Khas and Tando Allahyar orchards ship it first.'],
        ['Chaunsa Mango', 'fruits', 'mango', [6, 7, 8], [7], 'chaunsa', 'Late-season, honey-sweet and fibre-free; the last mangoes of summer.'],
        ['Banana', 'fruits', 'banana', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [9, 10, 11], 'banana', 'Thatta and Tando Muhammad Khan bananas are around all year.'],
        ['Kinnow', 'fruits', 'tangerine', [12, 1, 2, 3], [1, 2], 'kinnow', 'Winter citrus — juiciest in January and February.'],
        ['Watermelon', 'fruits', 'watermelon', [4, 5, 6, 7], [5, 6], 'watermelon', null],
        ['Cantaloupe', 'fruits', 'melon', [4, 5, 6, 7], [5, 6], 'cantaloupe', null],
        ['Strawberry', 'fruits', 'strawberry', [12, 1, 2, 3], [1, 2], 'strawberr', 'Short winter window — buy early in the week.'],
        ['Grapes', 'fruits', 'grapes', [6, 7, 8], [7], 'grape', null],
        ['Apple', 'fruits', 'red_apple', [8, 9, 10, 11], [9, 10], 'apple', 'Arrives from the northern valleys; stores well into winter.'],
        ['Pear', 'fruits', 'pear', [8, 9, 10], [9], 'pear', null],
        ['Lemon', 'fruits', 'lemon', [7, 8, 9, 10, 11, 12], [8, 9, 10], 'lemon', null],
        ['Coconut', 'fruits', 'coconut', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [4, 5, 6], 'coconut', 'Coastal Sindh crop; tender coconuts peak in the heat.'],
        ['Tomato', 'vegetables', 'tomato', [11, 12, 1, 2, 3, 4], [12, 1, 2], 'tomato', 'Sindh’s winter tomatoes feed the whole country — cheapest in January.'],
        ['Onion', 'vegetables', 'onion', [11, 12, 1, 2, 3], [12, 1], 'onion', null],
        ['Potato', 'vegetables', 'potato', [12, 1, 2, 3], [1, 2], 'potato', null],
        ['Carrot', 'vegetables', 'carrot', [11, 12, 1, 2, 3], [12, 1], 'carrot', 'Sweetest after the first cold nights — gajar halwa season.'],
        ['Peas', 'vegetables', 'pea_pod', [12, 1, 2, 3], [1, 2], 'peas', null],
        ['Eggplant', 'vegetables', 'eggplant', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [3, 4, 10, 11], 'eggplant', null],
        ['Broccoli', 'vegetables', 'broccoli', [11, 12, 1, 2], [12, 1], 'broccoli', null],
        ['Cucumber', 'vegetables', 'cucumber', [3, 4, 5, 6, 7, 8, 9], [5, 6], 'cucumber', null],
        ['Sweet Corn', 'vegetables', 'ear_of_corn', [7, 8, 9, 10], [8, 9], 'corn', null],
        ['Bell Pepper', 'vegetables', 'bell_pepper', [10, 11, 12, 1, 2, 3], [12, 1], 'bell pepper', null],
        ['Garlic', 'vegetables', 'garlic', [2, 3, 4, 5], [3, 4], 'garlic', 'Fresh-harvest garlic in spring; cured bulbs keep all year.'],
        ['Mushroom', 'vegetables', 'mushroom', [11, 12, 1, 2, 3], [12, 1], 'mushroom', null],
        ['Spinach (Palak)', 'herbs-greens', 'leafy_green', [10, 11, 12, 1, 2, 3], [12, 1], 'spinach', null],
        ['Coriander', 'herbs-greens', 'herb', [10, 11, 12, 1, 2, 3], [11, 12, 1], 'coriander', null],
        ['Green Chilli', 'herbs-greens', 'hot_pepper', [3, 4, 5, 6, 7, 8, 9, 10, 11], [6, 7, 8], 'chilli', null],
        ['Ginger', 'herbs-greens', 'ginger_root', [11, 12, 1, 2], [12, 1], 'ginger', null],
        ['Beri Honey', 'honey-preserves', 'honey_pot', [10, 11, 12], [11], 'beri', 'Harvested from beri (jujube) blossom after the monsoon.'],
        ['Sunflower', 'flowers', 'sunflower', [3, 4, 5], [4], 'sunflower', null],
        ['Tulip', 'flowers', 'tulip', [1, 2, 3], [2], 'tulip', null],
    ];

    private function seasons(): void
    {
        if (SeasonalProduce::exists()) {
            return;
        }
        $bySlug = Category::all()->keyBy('slug');
        foreach (self::SEASONS as $i => [$name, $category, $image, $months, $peak, $search, $notes]) {
            SeasonalProduce::create([
                'name' => $name, 'slug' => Str::slug($name), 'category_id' => $bySlug->get($category)?->id,
                'image' => $image, 'months' => $months, 'peak_months' => $peak, 'search' => $search,
                'notes' => $notes, 'sort_order' => $i, 'is_active' => true,
            ]);
        }
    }

    private function priceHistory(): void
    {
        if (DB::table('product_price_history')->where('recorded_on', '<', now()->subDays(7)->toDateString())->exists()) {
            return;
        }
        mt_srand(11);
        $rows = [];
        Product::query()->get(['id', 'name', 'price'])->each(function (Product $p) use (&$rows) {
            $season = SeasonalProduce::forProductName($p->name);
            for ($week = 26; $week >= 1; $week--) {
                $day = now()->subWeeks($week);
                $factor = $season
                    ? ($season->isPeak($day->month) ? 0.86 : ($season->inSeason($day->month) ? 0.97 : 1.18))
                    : 1 + 0.06 * sin(($p->id + $week) / 3);
                $factor *= 1 + (mt_rand(-40, 40) / 1000);
                $price = max(1, round($p->price * $factor / 5) * 5);
                $rows[] = ['product_id' => $p->id, 'price' => $price, 'recorded_on' => $day->toDateString()];
            }
        });

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('product_price_history')->insertOrIgnore($chunk);
        }
    }

    private function reviewPhotos(): void
    {
        if (ReviewPhoto::exists()) {
            return;
        }
        Review::where('reviewable_type', 'product')->where('rating', '>=', 4)->with('reviewable:id,photo')
            ->inRandomOrder()->limit(24)->get()
            ->each(function (Review $review) {
                if ($review->reviewable?->photo) {
                    ReviewPhoto::create(['review_id' => $review->id, 'path' => $review->reviewable->photo, 'width' => 1200, 'height' => 900, 'sort' => 0]);
                }
            });
    }

    private function stallFans(): void
    {
        $star = FarmerProfile::approved()->orderBy('id')->first();
        if (! $star) {
            return;
        }
        foreach (User::where('role', User::ROLE_CUSTOMER)->where('status', 'active')->where('email', 'like', '%@'.config('gleangrid.demo_domain'))->get() as $customer) {
            Favorite::firstOrCreate(['user_id' => $customer->id, 'favoritable_type' => 'farmer', 'favoritable_id' => $star->id]);
        }
    }
}
