<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Market;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => 'nullable|in:'.implode(',', Order::STATUSES),
            'market' => 'nullable|integer',
            'q' => 'nullable|string|max:50',
        ]);

        return Inertia::render('Admin/Orders', [
            'orders' => Order::with('customer:id,name', 'farmer:id,stall_name,slug', 'market:id,name')
                ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
                ->when($filters['market'] ?? null, fn ($q, $m) => $q->where('market_id', $m))
                ->when($filters['q'] ?? null, fn ($q, $t) => $q->where('code', 'like', "%{$t}%"))
                ->latest()->paginate(20)->withQueryString(),
            'markets' => Market::orderBy('name')->get(['id', 'name']),
            'filters' => $filters,
        ]);
    }
}
