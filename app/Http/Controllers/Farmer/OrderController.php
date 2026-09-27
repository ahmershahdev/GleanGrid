<?php

namespace App\Http\Controllers\Farmer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $farmer = $request->user()->farmerProfile;
        $filters = $request->validate([
            'status' => 'nullable|in:'.implode(',', Order::STATUSES),
            'date' => 'nullable|date_format:Y-m-d',
            'q' => 'nullable|string|max:50',
        ]);

        $base = Order::where('farmer_profile_id', $farmer->id);

        return Inertia::render('Farmer/Orders/Index', [
            'orders' => (clone $base)->with('customer:id,name,phone', 'market:id,name', 'items')
                ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
                ->when($filters['date'] ?? null, fn ($q, $d) => $q->whereDate('pickup_date', $d))
                ->when($filters['q'] ?? null, fn ($q, $s) => $q->searchWords($s, fn ($q, $t) => $q->where(fn ($w) => $w->where('code', 'like', "%{$t}%"))
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$t}%"))))
                ->orderByRaw("field(status, 'placed', 'accepted', 'ready', 'completed', 'declined', 'cancelled')")
                ->orderBy('pickup_date')->paginate(15)->withQueryString(),
            'counts' => (clone $base)->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status'),
            'filters' => (object) $filters,
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        $this->authorizeOrder($request, $order);

        return Inertia::render('Farmer/Orders/Show', [
            'order' => $order->load('customer:id,name,phone,email', 'market', 'items'),
            'history' => $order->statusHistory(),
            'customerNoShows' => $order->customer->recentNoShows(),
        ]);
    }

    public function scan(): Response
    {
        return Inertia::render('Farmer/Scan');
    }

    public function lookup(Request $request): RedirectResponse
    {
        $raw = (string) $request->validate(['code' => 'required|string|max:300'])['code'];
        preg_match('/GG-[A-Z0-9]{6}/i', $raw, $m);
        $order = $m ? Order::where('code', strtoupper($m[0]))->where('farmer_profile_id', $request->user()->farmerProfile->id)->first() : null;

        return $order
            ? redirect()->route('farmer.orders.show', $order)
            : back()->with('error', 'flash.order_not_found');
    }

    public function status(Request $request, Order $order, OrderService $service): RedirectResponse
    {
        $this->authorizeOrder($request, $order);
        $data = $request->validate([
            'status' => 'required|in:accepted,declined,ready,completed,no_show',
            'note' => 'nullable|string|max:500',
        ]);

        $service->transition($order, $data['status'], $data['note'] ?? null);

        return back()->with('success', 'flash.order_'.$data['status']);
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        abort_unless($order->farmer_profile_id === $request->user()->farmerProfile->id, 404);
    }
}
