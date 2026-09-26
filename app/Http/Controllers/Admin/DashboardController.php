<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\FarmerProfile;
use App\Models\LoginEvent;
use App\Models\Market;
use App\Models\Order;
use App\Models\User;
use Carbon\CarbonImmutable;
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
        ]);
    }

    /** Last-24h sign-in health: brute-force signals and accounts still to verify. */
    private function security(): array
    {
        $since = now()->subDay();
        $events = LoginEvent::where('created_at', '>=', $since);

        return [
            'failed' => (clone $events)->where('successful', false)->count(),
            'succeeded' => (clone $events)->where('successful', true)->count(),
            'unverified' => User::whereNull('email_verified_at')->count(),
            // IPs with 3+ failures are worth a look (the per-account limiter already slows them).
            'suspicious' => (clone $events)->where('successful', false)
                ->selectRaw('ip_address, count(*) as attempts, count(distinct login) as accounts, max(created_at) as last_seen')
                ->groupBy('ip_address')->havingRaw('count(*) >= 3')->orderByDesc('attempts')->limit(5)->get(),
            'recent' => LoginEvent::with('user:id,name,role')->latest('id')->limit(6)
                ->get(['id', 'user_id', 'login', 'ip_address', 'successful', 'created_at']),
        ];
    }
}
