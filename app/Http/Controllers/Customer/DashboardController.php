<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $orders = Order::whereIn('customer_id', $user->householdIds());

        $favoriteFarmerIds = $user->favorites()->where('favoritable_type', 'farmer')->pluck('favoritable_id');

        return Inertia::render('Customer/Dashboard', [
            'stats' => [
                'orders' => (clone $orders)->count(),
                'upcoming' => (clone $orders)->whereIn('status', Order::OPEN)->count(),
                'completed' => (clone $orders)->where('status', 'completed')->count(),
                'spent' => (float) (clone $orders)->where('status', 'completed')->sum('total_amount'),
                'favorites' => $user->favorites()->count(),
            ],
            'upcoming' => (clone $orders)->whereIn('status', Order::OPEN)
                ->with('farmer:id,stall_name,slug', 'market:id,name,slug,latitude,longitude,address')
                ->orderBy('pickup_date')->orderBy('pickup_starts_at')->limit(4)->get(),
            'recent' => (clone $orders)->with('farmer:id,stall_name,slug')->latest()->limit(5)->get(),
            'toReview' => Order::where('customer_id', $user->id)->where('status', 'completed')
                ->whereDoesntHave('reviews')->with('farmer:id,stall_name,slug')->latest('completed_at')->limit(3)->get(),
            'suggestions' => Product::orderable()->whereIn('farmer_profile_id', $favoriteFarmerIds)
                ->with('farmer:id,stall_name,slug')->inRandomOrder()->limit(4)->get(),
        ]);
    }
}
