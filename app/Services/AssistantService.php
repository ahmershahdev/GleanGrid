<?php

namespace App\Services;

use App\Models\Category;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AssistantService
{
    private const STOPWORDS = [
        'a', 'an', 'the', 'is', 'are', 'do', 'does', 'you', 'have', 'any', 'i', 'want', 'need', 'find', 'where',
        'can', 'get', 'buy', 'some', 'for', 'of', 'to', 'me', 'please', 'show', 'who', 'sells', 'sell', 'selling',
        'what', 'price', 'prices', 'cost', 'how', 'much', 'there', 'available', 'fresh', 'in', 'at', 'on', 'my',
        'and', 'or', 'with', 'looking', 'today', 'this', 'week', 'stock', 'it', 'be', 'will', 'which', 'from',
    ];

    private const GENERIC_NAME_WORDS = [
        'market', 'markets', 'bazaar', 'farmers', 'farm', 'farms', 'sunday', 'weekly', 'weekend', 'evening', 'the', 'fresh', 'organic',
        'stall', 'and', 'co', 'garden', 'gardens', 'harvest', 'heritage', 'produce', 'greens', 'countryside', 'mela', 'house',
        'dairy', 'honey', 'herb', 'herbs', 'bakehouse', 'bakery', 'poultry', 'eggs', 'orchards', 'mango', 'growers', 'collective',
        'valley', 'river', 'delta', 'bloom', 'stem', 'coastal', 'traders', 'sunrise', 'hilltop',
    ];

    public function answer(string $message, ?User $user = null): array
    {
        $text = Str::lower(trim($message));

        if (preg_match('/^(hi|hello|hey|salam|assalam|aoa|hola|bonjour|namaste|привет|你好|مرحبا|سلام)\b/u', $text)) {
            return $this->reply('greeting');
        }

        foreach ([
            'faq_payment' => '/\b(pay|payment|cash|card|money|price at pickup)\b/',
            'faq_delivery' => '/\b(deliver|delivery|courier|ship|shipping|home drop)\b/',
            'faq_cancel' => '/\b(cancel|modify|change|edit)\b.*\border\b|\border\b.*\b(cancel|modify|change|edit)\b/',
            'faq_cutoff' => '/\b(cut-?off|deadline|last time to order)\b/',
            'faq_farmer' => '/\b(become|join|register|sign up)\b.*\b(farmer|vendor|seller|stall)\b/',
            'faq_how' => '/\bhow (do|does|to|can)\b.*\b(order|pre-?order|work|reserve)\b/',
        ] as $intent => $pattern) {
            if (preg_match($pattern, $text)) {
                return $this->reply($intent);
            }
        }

        if (preg_match('/\bnext\b.*\b(pickup|pick-up|order|collection)\b|\bmy\b.*\b(pickup|pick-up|collection)\b/', $text)) {
            return $this->myNextPickup($user);
        }

        $farmer = $this->matchFarmer($text);
        $market = $this->matchMarket($text);

        if ($farmer && preg_match('/\b(slot|pickup|pick up|window|when)\b/', $text)) {
            return $this->reply('farmer_slots', ['farmer' => $farmer->stall_name], farmers: collect([$this->farmerCard($farmer, true)]));
        }
        if ($farmer) {
            return $this->reply('farmer_availability', ['farmer' => $farmer->stall_name], farmers: collect([$this->farmerCard($farmer, true)]));
        }

        $marketWords = ['market', 'markets', 'open', 'opened', 'trading', 'bazaar'];
        $onlyAboutMarkets = ! array_diff($this->keywords($text), $marketWords);
        if (preg_match('/\b(today|now|tonight)\b/', $text) && $onlyAboutMarkets) {
            $open = Market::active()->openOn((int) now()->dayOfWeek)->get();

            return $this->reply($open->isEmpty() ? 'none_today' : 'open_today', ['count' => $open->count()], markets: $open->map(fn ($m) => $this->marketCard($m)));
        }

        if (preg_match('/\b(time|timing|timings|hour|hours|open|opens|close|closes|when|schedule|days?)\b/', $text)) {
            $markets = $market ? collect([$market]) : Market::active()->orderBy('name')->get();

            return $this->reply('market_timings', ['market' => $market?->name], markets: $markets->map(fn ($m) => $this->marketCard($m)));
        }

        if ($market) {
            $farmers = $market->farmers()->approved()->get();

            return $this->reply('market_info', ['market' => $market->name, 'count' => $farmers->count()],
                markets: collect([$this->marketCard($market)]),
                farmers: $farmers->map(fn ($f) => $this->farmerCard($f)));
        }

        if (preg_match('/\b(slot|pickup|pick up|window)\b/', $text)) {
            return $this->reply('faq_pickup');
        }

        return $this->searchProducts($text);
    }

    private function myNextPickup(?User $user): array
    {
        if (! $user?->isCustomer()) {
            return $this->reply('my_orders_guest');
        }

        $order = $user->orders()->whereIn('status', Order::OPEN)->whereDate('pickup_date', '>=', today())
            ->with('farmer:id,stall_name,slug', 'market:id,name,slug')->orderBy('pickup_date')->orderBy('pickup_starts_at')->first();

        if (! $order) {
            return $this->reply('my_orders_none');
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

    private function searchProducts(string $text): array
    {
        $words = $this->keywords($text);
        if (! $words) {
            return $this->reply('fallback');
        }

        $stems = collect($words)->flatMap(fn ($w) => array_unique([$w, Str::singular($w), rtrim($w, 'es'), rtrim($w, 's')]))
            ->filter(fn ($w) => mb_strlen($w) >= 3)->unique()->values();

        $category = Category::where('is_active', true)->get()
            ->first(fn ($c) => $stems->contains(fn ($s) => str_contains(Str::lower($c->name), $s)));

        $products = Product::listed()->with('farmer:id,stall_name,slug')
            ->where(function ($q) use ($stems, $category) {
                foreach ($stems as $stem) {
                    $q->orWhere('name', 'like', "%{$stem}%");
                }
                if ($category) {
                    $q->orWhere('category_id', $category->id);
                }
            })
            ->orderByRaw("status = 'available' desc")->orderBy('price')->limit(6)->get();

        if ($products->isEmpty()) {
            return $this->reply('not_found', ['query' => implode(' ', $words)]);
        }

        $inStock = $products->filter->isOrderable()->count();

        return $this->reply($inStock ? 'products_found' : 'products_sold_out', ['query' => implode(' ', $words), 'count' => $inStock],
            products: $products->map(fn (Product $p) => [
                'name' => $p->name, 'slug' => $p->slug, 'price' => $p->price, 'unit' => $p->unit,
                'stock' => $p->stock_quantity, 'orderable' => $p->isOrderable(), 'image_url' => $p->image_url,
                'farmer' => $p->farmer->stall_name, 'farmer_slug' => $p->farmer->slug,
            ]));
    }

    private function keywords(string $text): array
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', $text, -1, PREG_SPLIT_NO_EMPTY);

        return array_values(array_filter($words, fn ($w) => mb_strlen($w) > 2 && ! in_array($w, self::STOPWORDS, true)));
    }

    private function matchMarket(string $text): ?Market
    {
        return Market::active()->get()->first(fn (Market $m) => $this->nameMentioned($m->name, $text));
    }

    private function matchFarmer(string $text): ?FarmerProfile
    {
        return FarmerProfile::approved()->get()->first(fn (FarmerProfile $f) => $this->nameMentioned($f->stall_name, $text));
    }

    private function nameMentioned(string $name, string $text): bool
    {
        if (str_contains($text, Str::lower($name))) {
            return true;
        }
        $tokens = array_filter(preg_split('/[^\p{L}\p{N}]+/u', Str::lower($name)), fn ($t) => mb_strlen($t) > 3 && ! in_array($t, self::GENERIC_NAME_WORDS, true));

        return collect($tokens)->contains(fn ($t) => preg_match('/\b'.preg_quote($t, '/').'\b/u', $text));
    }

    private function marketCard(Market $m): array
    {
        return [
            'name' => $m->name, 'slug' => $m->slug, 'address' => $m->address,
            'days' => $m->operating_days, 'opens_at' => substr($m->opens_at, 0, 5), 'closes_at' => substr($m->closes_at, 0, 5),
            'open_today' => $m->isOpenToday(),
        ];
    }

    private function farmerCard(FarmerProfile $f, bool $detailed = false): array
    {
        $card = ['name' => $f->stall_name, 'slug' => $f->slug, 'rating' => $f->rating_avg, 'days' => $f->operating_days ?? []];

        if ($detailed) {
            $card['in_stock'] = $f->products()->orderable()->count();
            $card['slots'] = $f->pickupSlots()->where('is_active', true)->with('market:id,name')->orderBy('day_of_week')->get()
                ->map(fn ($s) => ['day' => $s->day_of_week, 'from' => substr($s->starts_at, 0, 5), 'to' => substr($s->ends_at, 0, 5), 'market' => $s->market->name]);
            $card['cutoff'] = $f->order_cutoff_hours;
        }

        return $card;
    }

    private function reply(string $intent, array $params = [], ?Collection $products = null, ?Collection $markets = null, ?Collection $farmers = null): array
    {
        return array_filter([
            'intent' => $intent,
            'params' => $params,
            'products' => $products?->values(),
            'markets' => $markets?->values(),
            'farmers' => $farmers?->values(),
        ], fn ($v) => $v !== null);
    }
}
