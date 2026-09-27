<?php

namespace App\Http\Controllers\Customer;

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
        $filters = $request->validate([
            'status' => 'nullable|in:open,'.implode(',', Order::STATUSES),
            'household' => 'nullable|boolean',
        ]);
        $user = $request->user();
        $customerIds = ($filters['household'] ?? false) ? $user->householdIds() : [$user->id];

        $orders = Order::whereIn('customer_id', $customerIds)
            ->with('farmer:id,stall_name,slug,logo', 'market:id,name,slug', 'items', 'customer:id,name')
            ->when($filters['status'] ?? null, fn ($q, $s) => $s === 'open' ? $q->whereIn('status', Order::OPEN) : $q->where('status', $s))
            ->latest()->paginate(10)->withQueryString()
            ->through(fn (Order $o) => [...$o->toArray(), 'editable' => $o->isEditableByCustomer()]);

        return Inertia::render('Customer/Orders/Index', [
            'orders' => $orders,
            'filters' => (object) $filters,
            'hasHousehold' => count($user->householdIds()) > 1,
            'placed' => session('placed'),
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        $this->authorizeView($request, $order);
        $order->load('farmer', 'market', 'items.product', 'reviews', 'customer:id,name');

        return Inertia::render('Customer/Orders/Show', [
            'order' => [...$order->toArray(), 'editable' => $order->isEditableByCustomer()],
            'isOwner' => $order->customer_id === $request->user()->id,
            'reviewed' => $order->reviews->map(fn ($r) => $r->reviewable_type.':'.$r->reviewable_id),
            'history' => $order->statusHistory(),
            'scanUrl' => route('farmer.orders.show', $order),
        ]);
    }

    public function edit(Request $request, Order $order, OrderService $service): Response|RedirectResponse
    {
        $this->authorizeOwner($request, $order);
        if (! $order->isEditableByCustomer()) {
            return redirect()->route('customer.orders.show', $order)->with('error', 'flash.order_locked');
        }

        $order->load('items', 'farmer', 'market');
        $held = $order->items->pluck('quantity', 'product_id');

        return Inertia::render('Customer/Orders/Edit', [
            'order' => $order,
            'products' => $order->farmer->products()->listed()->get()
                ->map(fn ($p) => [...$p->only('id', 'name', 'price', 'unit', 'image_url', 'status'), 'available' => $p->stock_quantity + ($held[$p->id] ?? 0)])
                ->filter(fn ($p) => $p['available'] > 0 && ($p['status'] !== 'unavailable' || isset($held[$p['id']])))->values(),
            'slots' => $service->availableSlots($order->farmer),
        ]);
    }

    public function update(Request $request, Order $order, OrderService $service): RedirectResponse
    {
        $this->authorizeOwner($request, $order);
        $data = $request->validate([
            'pickup_slot_id' => 'required|integer',
            'pickup_date' => 'required|date_format:Y-m-d',
            'note' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:0|max:999',
        ]);

        $service->modify($order, $data);

        return redirect()->route('customer.orders.show', $order)->with('success', 'flash.order_updated');
    }

    public function cancel(Request $request, Order $order, OrderService $service): RedirectResponse
    {
        $this->authorizeOwner($request, $order);
        $service->cancel($order);

        return back()->with('success', 'flash.order_cancelled');
    }

    private function authorizeView(Request $request, Order $order): void
    {
        abort_unless(in_array($order->customer_id, $request->user()->householdIds(), true), 404);
    }

    private function authorizeOwner(Request $request, Order $order): void
    {
        abort_unless($order->customer_id === $request->user()->id, 403);
    }
}
