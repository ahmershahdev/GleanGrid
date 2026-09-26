<?php

namespace App\Http\Controllers\Farmer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $farmer = $request->user()->farmerProfile;
        $orders = Order::where('farmer_profile_id', $farmer->id);
        $completed = (clone $orders)->where('status', 'completed');

        // Revenue for the last 8 weeks, oldest first, zero-filled.
        $start = CarbonImmutable::now()->startOfWeek()->subWeeks(7);
        $weekly = (clone $completed)->where('completed_at', '>=', $start)->get(['completed_at', 'total_amount'])
            ->groupBy(fn ($o) => $o->completed_at->startOfWeek()->toDateString());
        $revenueChart = collect(range(0, 7))->map(function ($i) use ($start, $weekly) {
            $week = $start->addWeeks($i)->toDateString();

            return ['week' => $week, 'revenue' => round((float) ($weekly[$week] ?? collect())->sum('total_amount'), 2), 'orders' => ($weekly[$week] ?? collect())->count()];
        });

        return Inertia::render('Farmer/Dashboard', [
            'farmer' => $farmer->only('id', 'stall_name', 'slug', 'status', 'status_reason', 'rating_avg', 'rating_count', 'order_cutoff_hours'),
            'setup' => [
                'profile' => (bool) $farmer->bio && $farmer->latitude !== null,
                'markets' => $farmer->markets()->exists(),
                'slots' => $farmer->pickupSlots()->exists(),
                'products' => $farmer->products()->exists(),
            ],
            'stats' => [
                'total' => (clone $orders)->count(),
                'pending' => (clone $orders)->where('status', 'placed')->count(),
                'to_prepare' => (clone $orders)->where('status', 'accepted')->count(),
                'ready' => (clone $orders)->where('status', 'ready')->count(),
                'revenue' => (float) (clone $completed)->sum('total_amount'),
                'revenue_week' => (float) (clone $completed)->where('completed_at', '>=', now()->startOfWeek())->sum('total_amount'),
                'pipeline' => (float) (clone $orders)->whereIn('status', Order::OPEN)->sum('total_amount'),
            ],
            'revenueChart' => $revenueChart,
            'bestSellers' => OrderItem::query()
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->where('orders.farmer_profile_id', $farmer->id)->where('orders.status', 'completed')
                ->selectRaw('order_items.product_name as name, order_items.unit, sum(order_items.quantity) as qty, sum(order_items.line_total) as revenue')
                ->groupBy('order_items.product_name', 'order_items.unit')->orderByDesc('qty')->limit(5)->get(),
            'upcoming' => (clone $orders)->whereIn('status', Order::OPEN)->with('customer:id,name', 'market:id,name')
                ->orderBy('pickup_date')->orderBy('pickup_starts_at')->limit(6)->get(),
            'lowStock' => $farmer->products()->whereNull('removed_at')->where('status', '!=', 'unavailable')
                ->where('stock_quantity', '<=', 5)->orderBy('stock_quantity')->limit(5)->get(['id', 'name', 'stock_quantity', 'unit', 'status', 'image']),
        ]);
    }
}
