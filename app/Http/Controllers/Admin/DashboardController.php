<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\ContactMessage;
use App\Models\Coupon;
use App\Models\FarmerProfile;
use App\Models\LoginEvent;
use App\Models\Market;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Support\BotGuard;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $start = CarbonImmutable::today()->subDays(29);
        $daily = Order::where('created_at', '>=', $start)
            ->selectRaw('date(created_at) as d, count(*) as orders, sum(case when status = "completed" then total_amount else 0 end) as revenue')
            ->groupBy('d')->get()->keyBy('d');

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'farmers' => FarmerProfile::where('status', 'approved')->count(),
                'pending_farmers' => FarmerProfile::where('status', 'pending')->count(),
                'customers' => User::where('role', User::ROLE_CUSTOMER)->count(),
                'markets' => Market::count(),
                'orders' => Order::count(),
                'open_orders' => Order::whereIn('status', Order::OPEN)->count(),
                'revenue' => (float) Order::where('status', 'completed')->sum('total_amount'),
                'unread_messages' => ContactMessage::where('is_read', false)->count(),
            ],
            'daily' => collect(range(0, 29))->map(function ($i) use ($start, $daily) {
                $d = $start->addDays($i)->toDateString();

                return ['date' => $d, 'orders' => (int) ($daily[$d]->orders ?? 0), 'revenue' => round((float) ($daily[$d]->revenue ?? 0), 2)];
            }),
            'byStatus' => Order::selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status'),
            'topFarmers' => FarmerProfile::withCount('orders')
                ->withSum(['orders as revenue' => fn ($q) => $q->where('status', 'completed')], 'total_amount')
                ->orderByDesc('orders_count')->limit(5)->get(['id', 'stall_name', 'slug', 'rating_avg']),
            'pendingFarmers' => FarmerProfile::where('status', 'pending')->with('user:id,name,email,created_at')->latest()->limit(5)->get(),
            'recentOrders' => Order::with('customer:id,name', 'farmer:id,stall_name')->latest()->limit(6)->get(),
            'security' => $this->security(),
            'kpis' => $this->kpis(),
            'today' => $this->today(),
            'catalogue' => $this->catalogue(),
            'marketRevenue' => $this->marketRevenue($start),
            'topProducts' => $this->topProducts($start),
            'pickupsWeek' => $this->pickupsWeek(),
            'system' => $this->system(),
        ]);
    }

    private function kpis(): array
    {
        $now = CarbonImmutable::now();
        $window = fn (CarbonImmutable $from, CarbonImmutable $to) => Order::whereBetween('created_at', [$from, $to]);

        $measure = function (CarbonImmutable $from, CarbonImmutable $to) use ($window) {
            $orders = $window($from, $to)->count();
            $completed = $window($from, $to)->where('status', 'completed');
            $revenue = (float) (clone $completed)->sum('total_amount');
            $done = (clone $completed)->count();
            $lost = $window($from, $to)->whereIn('status', ['cancelled', 'declined'])->count();

            return [
                'orders' => $orders,
                'revenue' => round($revenue, 2),
                'aov' => $done ? round($revenue / $done, 2) : 0,
                'completion' => $orders ? round($done / $orders * 100, 1) : 0,
                'lost' => $orders ? round($lost / $orders * 100, 1) : 0,
                'customers' => User::where('role', User::ROLE_CUSTOMER)->whereBetween('created_at', [$from, $to])->count(),
                'discounts' => round((float) $window($from, $to)->where('status', '!=', 'cancelled')->sum('discount_amount'), 2),
            ];
        };

        $current = $measure($now->subDays(30), $now);
        $previous = $measure($now->subDays(60), $now->subDays(30));

        return collect($current)->map(fn ($value, $key) => [
            'value' => $value,
            'previous' => $previous[$key],
            'change' => $previous[$key] > 0 ? round(($value - $previous[$key]) / $previous[$key] * 100, 1) : null,
        ])->all();
    }

    private function today(): array
    {
        $today = now()->toDateString();

        return [
            'placed' => Order::whereDate('created_at', $today)->count(),
            'pickups' => Order::whereDate('pickup_date', $today)->whereIn('status', Order::OPEN)->count(),
            'awaiting_accept' => Order::where('status', 'placed')->count(),
            'ready' => Order::where('status', 'ready')->count(),
            'overdue' => Order::whereDate('pickup_date', '<', $today)->whereIn('status', Order::OPEN)->count(),
        ];
    }

    private function catalogue(): array
    {
        $listed = Product::listed();

        return [
            'products' => (clone $listed)->count(),
            'sold_out' => (clone $listed)->where(fn ($q) => $q->where('status', 'sold_out')->orWhere('stock_quantity', 0))->count(),
            'low_stock' => (clone $listed)->where('status', 'available')->whereBetween('stock_quantity', [1, 5])->count(),
            'removed' => Product::whereNotNull('removed_at')->count(),
            'hidden_reviews' => Review::where('is_hidden', true)->count(),
            'low_reviews' => Review::where('is_hidden', false)->where('rating', '<=', 2)->count(),
            'categories' => Category::where('is_active', true)->count(),
            'coupons' => Coupon::where('is_active', true)
                ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()))->count(),
        ];
    }

    private function marketRevenue(CarbonImmutable $start): array
    {
        return Market::query()
            ->withCount(['orders as orders_count' => fn ($q) => $q->where('created_at', '>=', $start)])
            ->withSum(['orders as revenue' => fn ($q) => $q->where('created_at', '>=', $start)->where('status', 'completed')], 'total_amount')
            ->orderByDesc('revenue')->limit(6)->get(['id', 'name', 'slug'])
            ->map(fn (Market $m) => ['name' => $m->name, 'slug' => $m->slug, 'orders' => $m->orders_count, 'revenue' => round((float) $m->revenue, 2)])
            ->all();
    }

    private function topProducts(CarbonImmutable $start): array
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.created_at', '>=', $start)
            ->whereNotIn('orders.status', ['cancelled', 'declined'])
            ->groupBy('order_items.product_name', 'order_items.unit')
            ->orderByDesc('qty')->limit(6)
            ->get(['order_items.product_name as name', 'order_items.unit', DB::raw('sum(order_items.quantity) as qty'), DB::raw('sum(order_items.line_total) as revenue')])
            ->map(fn ($r) => ['name' => $r->name, 'unit' => $r->unit, 'qty' => (int) $r->qty, 'revenue' => round((float) $r->revenue, 2)])
            ->all();
    }

    private function pickupsWeek(): array
    {
        $from = CarbonImmutable::today();
        $counts = Order::whereBetween('pickup_date', [$from->toDateString(), $from->addDays(6)->toDateString()])
            ->whereIn('status', Order::OPEN)
            ->selectRaw('pickup_date, count(*) as c')->groupBy('pickup_date')->pluck('c', 'pickup_date');

        return collect(range(0, 6))->map(function ($i) use ($from, $counts) {
            $d = $from->addDays($i)->toDateString();

            return ['date' => $d, 'pickups' => (int) ($counts[$d] ?? 0)];
        })->all();
    }

    private function system(): array
    {
        return [
            'env' => app()->environment(),
            'debug' => (bool) config('app.debug'),
            'queue' => config('queue.default'),
            'mail' => config('mail.default'),
            'captcha' => BotGuard::enabled(),
            'storage_link' => file_exists(public_path('storage').DIRECTORY_SEPARATOR.'.'),
            'image_engine' => function_exists('imagewebp') ? 'GD + WebP' : 'client-side only',
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
        ];
    }

    private function security(): array
    {
        $since = now()->subDay();
        $events = LoginEvent::where('created_at', '>=', $since);

        return [
            'failed' => (clone $events)->where('successful', false)->count(),
            'succeeded' => (clone $events)->where('successful', true)->count(),
            'unverified' => User::whereNull('email_verified_at')->count(),
            'suspicious' => (clone $events)->where('successful', false)
                ->selectRaw('ip_address, count(*) as attempts, count(distinct login) as accounts, max(created_at) as last_seen')
                ->groupBy('ip_address')->havingRaw('count(*) >= 3')->orderByDesc('attempts')->limit(5)->get(),
            'recent' => LoginEvent::with('user:id,name,role')->latest('id')->limit(6)
                ->get(['id', 'user_id', 'login', 'ip_address', 'successful', 'created_at']),
        ];
    }
}
