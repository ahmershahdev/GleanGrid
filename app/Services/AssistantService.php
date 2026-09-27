<?php

namespace App\Services;

use App\Models\Category;
use App\Models\FarmerBadge;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\Product;
use App\Models\SeasonalProduce;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AssistantService
{
    public const PUBLIC = [
        'greeting', 'open_today', 'market_timings', 'browse', 'in_season', 'top_rated', 'price_drops',
        'faq_how', 'faq_payment', 'faq_online_pay', 'faq_refunds', 'faq_delivery', 'faq_cancel', 'faq_cutoff',
        'faq_pickup', 'faq_farmer', 'faq_alerts', 'faq_badges', 'faq_privacy',
    ];

    public const CUSTOMER = ['my_profile', 'my_orders', 'track_order', 'my_next_pickup', 'my_cart', 'my_favorites', 'my_alerts', 'my_payments', 'my_spending', 'my_reviews'];

    public const FARMER = ['my_profile', 'farmer_today', 'farmer_pending', 'farmer_low_stock', 'farmer_standing'];

    public const ADMIN = ['my_profile', 'admin_overview'];

    public const TOPICS = ['fruits', 'vegetables', 'dairy-eggs', 'honey-preserves', 'baked-goods', 'herbs-greens', 'mango'];

    public static function intents(): array
    {
        return array_values(array_unique([...self::PUBLIC, ...self::CUSTOMER, ...self::FARMER, ...self::ADMIN]));
    }

    public function answer(string $intent, ?User $user = null, array $context = []): array
    {
        if (in_array($intent, self::PUBLIC, true)) {
            return match ($intent) {
                'greeting' => $this->reply('greeting', ['name' => $user ? strtok($user->name, ' ') : null, 'role' => $user?->role]),
                'open_today' => $this->openToday(),
                'market_timings' => $this->reply('market_timings', [], markets: Market::active()->orderBy('name')->get()->map(fn ($m) => $this->marketCard($m))),
                'browse' => $this->browse($context['topic'] ?? 'fruits'),
                'in_season' => $this->inSeason(),
                'top_rated' => $this->topRated(),
                'price_drops' => $this->priceDrops(),
                default => $this->reply($intent),
            };
        }

        if ($intent === 'my_cart' && (! $user || $user->isCustomer())) {
            return $this->cart($context['cart'] ?? []);
        }
        if (! $user) {
            return $this->reply('login_required');
        }

        $allowed = match ($user->role) {
            User::ROLE_CUSTOMER => self::CUSTOMER,
            User::ROLE_FARMER => self::FARMER,
            default => self::ADMIN,
        };
        if (! in_array($intent, $allowed, true)) {
            return $this->reply('not_for_role', ['role' => $user->role]);
        }

        return match ($intent) {
            'my_profile' => $this->profile($user),
            'my_orders' => $this->orders($user),
            'track_order' => $this->track($user),
            'my_next_pickup' => $this->nextPickup($user),
            'my_cart' => $this->cart($context['cart'] ?? []),
            'my_favorites' => $this->favorites($user),
            'my_alerts' => $this->alerts($user),
            'my_payments' => $this->payments($user),
            'my_spending' => $this->spending($user),
            'my_reviews' => $this->reviews($user),
            'farmer_today' => $this->farmerToday($user),
            'farmer_pending' => $this->farmerPending($user),
            'farmer_low_stock' => $this->farmerLowStock($user),
            'farmer_standing' => $this->farmerStanding($user),
            'admin_overview' => $this->adminOverview(),
        };
    }

    private function profile(User $user): array
    {
        return $this->reply('my_profile', [
            'name' => $user->name,
            'first' => strtok($user->name, ' '),
            'username' => $user->username,
            'email' => $user->email,
            'phone' => $user->phone,
            'city' => $user->city,
            'role' => $user->role,
            'since' => $user->created_at?->toDateString(),
            'verified' => $user->hasVerifiedEmail(),
            'password' => $user->hasPassword(),
            'linked' => $user->socialAccounts()->pluck('provider'),
            'orders' => $user->isCustomer() ? $user->orders()->count() : null,
            'stall' => $user->isFarmer() ? $user->farmerProfile?->stall_name : null,
        ]);
    }

    private function orders(User $user): array
    {
        $counts = $user->orders()->selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c', 'status');
        $recent = $user->orders()->with('farmer:id,stall_name')->latest('id')->limit(5)->get();

        return $this->reply($recent->isEmpty() ? 'my_orders_none' : 'my_orders', [
            'total' => (int) $counts->sum(),
            'open' => (int) collect(Order::OPEN)->sum(fn ($s) => $counts[$s] ?? 0),
            'completed' => (int) ($counts['completed'] ?? 0),
            'cancelled' => (int) (($counts['cancelled'] ?? 0) + ($counts['declined'] ?? 0)),
        ], orders: $recent->map(fn (Order $o) => $this->orderCard($o)));
    }

    private function track(User $user): array
    {
        $open = $user->orders()->whereIn('status', Order::OPEN)->with('farmer:id,stall_name', 'market:id,name')
            ->orderBy('pickup_date')->orderBy('pickup_starts_at')->limit(5)->get();

        return $this->reply($open->isEmpty() ? 'track_none' : 'track_order', ['count' => $open->count()],
            orders: $open->map(fn (Order $o) => [...$this->orderCard($o), 'step' => array_search($o->status, Order::OPEN, true) + 1, 'market' => $o->market?->name]));
    }

    private function nextPickup(User $user): array
    {
        $order = $user->orders()->whereIn('status', Order::OPEN)->whereDate('pickup_date', '>=', today())
            ->with('farmer:id,stall_name,slug', 'market:id,name,slug')->orderBy('pickup_date')->orderBy('pickup_starts_at')->first();

        if (! $order) {
            return $this->reply('track_none');
        }

        return $this->reply('my_next_pickup', [
            'code' => $order->code,
            'farmer' => $order->farmer->stall_name,
            'market' => $order->market->name,
            'date' => $order->pickup_date->toDateString(),
            'from' => substr($order->pickup_starts_at, 0, 5),
            'to' => substr($order->pickup_ends_at, 0, 5),
            'status' => $order->status,
            'url' => route('customer.orders.show', $order),
        ]);
    }

    private function cart(array $items): array
    {
        $qty = collect($items)->mapWithKeys(fn ($i) => [(int) $i['id'] => (int) $i['quantity']])->filter(fn ($q) => $q > 0);
        if ($qty->isEmpty()) {
            return $this->reply('my_cart_empty');
        }

        $products = Product::listed()->with('farmer:id,stall_name')->whereIn('id', $qty->keys())->get();
        $lines = $products->map(fn (Product $p) => [
            'name' => $p->name, 'slug' => $p->slug, 'image_url' => $p->image_url, 'farmer' => $p->farmer->stall_name,
            'quantity' => $qty[$p->id], 'price' => $p->price, 'unit' => $p->unit, 'line' => round($p->price * $qty[$p->id], 2),
            'orderable' => $p->isOrderable() && $p->stock_quantity >= $qty[$p->id], 'stock' => $p->stock_quantity,
        ]);

        return $this->reply('my_cart', [
            'items' => $lines->sum('quantity'),
            'total' => round($lines->where('orderable', true)->sum('line'), 2),
            'stalls' => $products->pluck('farmer_profile_id')->unique()->count(),
            'problems' => $lines->where('orderable', false)->count(),
        ], lines: $lines->values());
    }

    private function favorites(User $user): array
    {
        $favs = $user->favorites()->with('favoritable')->latest()->get()->filter(fn ($f) => $f->favoritable);
        $products = $favs->where('favoritable_type', 'product')->take(6)->map(fn ($f) => $this->productCard($f->favoritable->loadMissing('farmer:id,stall_name,slug')));

        return $this->reply($favs->isEmpty() ? 'my_favorites_none' : 'my_favorites', [
            'products' => $favs->where('favoritable_type', 'product')->count(),
            'farmers' => $favs->where('favoritable_type', 'farmer')->count(),
            'markets' => $favs->where('favoritable_type', 'market')->count(),
        ], products: $products->values(), farmers: $favs->where('favoritable_type', 'farmer')->take(4)->map(fn ($f) => $this->farmerCard($f->favoritable))->values());
    }

    private function alerts(User $user): array
    {
        $alerts = $user->stockAlerts()->whereNull('notified_at')->with('product.farmer:id,stall_name,slug')->latest()->limit(8)->get()
            ->filter(fn ($a) => $a->product);

        return $this->reply($alerts->isEmpty() ? 'my_alerts_none' : 'my_alerts', ['count' => $alerts->count()],
            products: $alerts->map(fn ($a) => $this->productCard($a->product))->values());
    }

    private function payments(User $user): array
    {
        $payments = $user->payments()->withCount('orders')->latest('id')->limit(5)->get();

        return $this->reply($payments->isEmpty() ? 'my_payments_none' : 'my_payments', [
            'paid' => (float) $user->payments()->whereIn('status', ['paid', 'partially_refunded', 'refunded'])->sum('amount'),
            'refunded' => (float) $user->payments()->sum('refunded_amount'),
            'open' => $user->payments()->whereIn('status', ['pending', 'processing'])->where('expires_at', '>', now())->count(),
        ], payments: $payments->map(fn ($p) => [...$p->only('reference', 'method', 'status', 'amount', 'card_brand', 'card_last4'), 'orders' => $p->orders_count, 'at' => $p->created_at->toIso8601String(), 'url' => route('customer.payments.show', $p)]));
    }

    private function spending(User $user): array
    {
        $completed = $user->orders()->where('status', 'completed');
        $favourite = (clone $completed)->selectRaw('farmer_profile_id, COUNT(*) as c')->groupBy('farmer_profile_id')->orderByDesc('c')->first();

        return $this->reply('my_spending', [
            'spent' => (float) (clone $completed)->sum('total_amount'),
            'month' => (float) (clone $completed)->where('completed_at', '>=', now()->startOfMonth())->sum('total_amount'),
            'saved' => (float) $user->orders()->whereNotIn('status', ['cancelled', 'declined'])->sum('discount_amount'),
            'orders' => (clone $completed)->count(),
            'favourite' => $favourite ? FarmerProfile::find($favourite->farmer_profile_id)?->stall_name : null,
        ]);
    }

    private function reviews(User $user): array
    {
        $reviews = $user->reviews();

        return $this->reply($reviews->count() ? 'my_reviews' : 'my_reviews_none', [
            'count' => $reviews->count(),
            'average' => round((float) $user->reviews()->avg('rating'), 1),
            'photos' => DB::table('review_photos')->join('reviews', 'reviews.id', '=', 'review_photos.review_id')->where('reviews.user_id', $user->id)->count(),
            'replies' => $user->reviews()->whereNotNull('farmer_reply')->count(),
        ]);
    }

    private function farmerToday(User $user): array
    {
        $stall = $user->farmerProfile;
        if (! $stall) {
            return $this->reply('not_for_role', ['role' => $user->role]);
        }
        $orders = $stall->orders()->whereDate('pickup_date', today())->whereNotIn('status', ['cancelled'])->with('market:id,name')->orderBy('pickup_starts_at')->get();

        return $this->reply('farmer_today', [
            'count' => $orders->count(),
            'ready' => $orders->where('status', 'ready')->count(),
            'to_pack' => $orders->whereIn('status', ['placed', 'accepted'])->count(),
            'value' => round($orders->whereNotIn('status', ['declined', 'no_show'])->sum('total_amount'), 2),
        ], orders: $orders->take(6)->map(fn (Order $o) => [...$this->orderCard($o, 'farmer'), 'market' => $o->market?->name])->values());
    }

    private function farmerPending(User $user): array
    {
        $stall = $user->farmerProfile;
        $orders = $stall ? $stall->orders()->where('status', 'placed')->where(fn ($q) => $q->where('payment_status', '!=', 'pending'))
            ->orderBy('pickup_date')->limit(6)->get() : collect();

        return $this->reply($orders->isEmpty() ? 'farmer_pending_none' : 'farmer_pending', ['count' => $orders->count()],
            orders: $orders->map(fn (Order $o) => $this->orderCard($o, 'farmer'))->values());
    }

    private function farmerLowStock(User $user): array
    {
        $products = $user->farmerProfile?->products()->whereNull('removed_at')->where('status', '!=', 'unavailable')
            ->where('stock_quantity', '<=', 3)->orderBy('stock_quantity')->limit(8)->get() ?? collect();

        return $this->reply($products->isEmpty() ? 'farmer_low_stock_none' : 'farmer_low_stock', ['count' => $products->count()],
            products: $products->map(fn (Product $p) => [...$this->productCard($p->setRelation('farmer', $user->farmerProfile)), 'edit' => route('farmer.products.edit', $p)])->values());
    }

    private function farmerStanding(User $user): array
    {
        $stall = $user->farmerProfile;
        if (! $stall) {
            return $this->reply('not_for_role', ['role' => $user->role]);
        }
        $badges = app(BadgeService::class);
        $m = $badges->metrics(collect([$stall]))->get($stall->id);
        $rules = $badges->rules();

        return $this->reply('farmer_standing', [
            ...collect($m)->only('reviews', 'average', 'score', 'completed', 'fulfilment', 'favourites')->all(),
            'badges' => $stall->activeBadges->pluck('badge'),
            'needs_reviews' => max(0, $rules['top_rated_min_reviews'] - $m['reviews']),
            'min_score' => $rules['top_rated_min_score'],
        ]);
    }

    private function adminOverview(): array
    {
        return $this->reply('admin_overview', [
            'pending_farmers' => FarmerProfile::where('status', 'pending')->count(),
            'open_orders' => Order::whereIn('status', Order::OPEN)->count(),
            'open_payments' => DB::table('payments')->whereIn('status', ['pending', 'processing'])->count(),
            'unread' => DB::table('contact_messages')->where('is_read', false)->count(),
            'hidden_reviews' => DB::table('reviews')->where('is_hidden', true)->count(),
        ]);
    }

    private function openToday(): array
    {
        $open = Market::active()->openOn((int) now()->dayOfWeek)->get();

        return $this->reply($open->isEmpty() ? 'none_today' : 'open_today', ['count' => $open->count()], markets: $open->map(fn ($m) => $this->marketCard($m)));
    }

    private function browse(string $topic): array
    {
        $query = Product::listed()->with('farmer:id,stall_name,slug');
        $query = $topic === 'mango'
            ? $query->where('name', 'like', '%mango%')
            : $query->whereHas('category', fn ($q) => $q->where('slug', $topic));

        $products = $query->orderByRaw("status = 'available' desc")->orderByDesc('rating_avg')->limit(6)->get();
        $label = $topic === 'mango' ? 'mango' : (Category::where('slug', $topic)->value('name') ?? $topic);

        if ($products->isEmpty()) {
            return $this->reply('not_found', ['query' => $label]);
        }

        return $this->reply('products_found', ['query' => $label, 'topic' => $topic, 'count' => $products->filter->isOrderable()->count()],
            products: $products->map(fn (Product $p) => $this->productCard($p)));
    }

    private function inSeason(): array
    {
        $month = (int) now()->month;
        $items = SeasonalProduce::active()->orderBy('sort_order')->get()->filter->inSeason($month);

        return $this->reply('in_season', ['count' => $items->count(), 'month' => $month], season: $items->map(fn ($s) => [
            'name' => $s->name, 'image' => $s->image, 'peak' => $s->isPeak($month), 'search' => $s->search ?: $s->name,
        ])->values());
    }

    private function topRated(): array
    {
        $ids = FarmerBadge::active()->where('badge', 'top_rated')->pluck('farmer_profile_id');
        $farmers = FarmerProfile::approved()->when($ids->isNotEmpty(), fn ($q) => $q->whereIn('id', $ids))
            ->orderByDesc('rating_avg')->orderByDesc('rating_count')->limit(5)->get();

        return $this->reply('top_rated', ['count' => $farmers->count()], farmers: $farmers->map(fn ($f) => $this->farmerCard($f)));
    }

    private function priceDrops(): array
    {
        $then = DB::table('product_price_history as h')
            ->whereRaw('h.id = (SELECT h2.id FROM product_price_history h2 WHERE h2.product_id = h.product_id AND h2.recorded_on <= ? ORDER BY h2.recorded_on DESC LIMIT 1)', [now()->subDays(21)->toDateString()])
            ->pluck('price', 'product_id');

        $products = Product::orderable()->with('farmer:id,stall_name,slug')->whereIn('id', $then->keys())->get()
            ->map(fn (Product $p) => ['p' => $p, 'drop' => $then[$p->id] > 0 ? round(($then[$p->id] - $p->price) / $then[$p->id] * 100, 1) : 0, 'was' => (float) $then[$p->id]])
            ->filter(fn ($x) => $x['drop'] >= 1)->sortByDesc('drop')->take(6);

        return $this->reply($products->isEmpty() ? 'price_drops_none' : 'price_drops', ['count' => $products->count()],
            products: $products->map(fn ($x) => [...$this->productCard($x['p']), 'was' => $x['was'], 'drop' => $x['drop']])->values());
    }

    private function orderCard(Order $o, string $as = 'customer'): array
    {
        return [
            'code' => $o->code,
            'status' => $o->status,
            'payment_status' => $o->payment_status,
            'payment_method' => $o->payment_method,
            'date' => $o->pickup_date->toDateString(),
            'from' => substr((string) $o->pickup_starts_at, 0, 5),
            'to' => substr((string) $o->pickup_ends_at, 0, 5),
            'total' => (float) $o->total_amount,
            'farmer' => $o->farmer?->stall_name,
            'url' => route($as === 'farmer' ? 'farmer.orders.show' : 'customer.orders.show', $o),
        ];
    }

    private function productCard(Product $p): array
    {
        return [
            'name' => $p->name, 'slug' => $p->slug, 'price' => $p->price, 'unit' => $p->unit,
            'stock' => $p->stock_quantity, 'orderable' => $p->isOrderable(), 'image_url' => $p->image_url,
            'farmer' => $p->farmer?->stall_name, 'farmer_slug' => $p->farmer?->slug,
        ];
    }

    private function marketCard(Market $m): array
    {
        return [
            'name' => $m->name, 'slug' => $m->slug, 'address' => $m->address,
            'days' => $m->operating_days, 'opens_at' => substr($m->opens_at, 0, 5), 'closes_at' => substr($m->closes_at, 0, 5),
            'open_today' => $m->isOpenToday(),
        ];
    }

    private function farmerCard(FarmerProfile $f): array
    {
        return [
            'name' => $f->stall_name, 'slug' => $f->slug, 'rating' => $f->rating_avg, 'reviews' => $f->rating_count,
            'logo_url' => $f->logo_url, 'badges' => $f->activeBadges->pluck('badge'),
        ];
    }

    private function reply(string $intent, array $params = [], ?Collection $products = null, ?Collection $markets = null, ?Collection $farmers = null,
        ?Collection $orders = null, ?Collection $payments = null, ?Collection $lines = null, ?Collection $season = null): array
    {
        return array_filter([
            'intent' => $intent,
            'params' => $params,
            'products' => $products?->values(),
            'markets' => $markets?->values(),
            'farmers' => $farmers?->values(),
            'orders' => $orders?->values(),
            'payments' => $payments?->values(),
            'lines' => $lines?->values(),
            'season' => $season?->values(),
        ], fn ($v) => $v !== null);
    }
}
