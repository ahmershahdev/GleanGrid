<?php

namespace App\Services;

use App\Models\FarmerProfile;
use App\Models\Order;
use App\Models\PickupSlot;
use App\Models\Product;
use App\Models\User;
use App\Notifications\PlatformNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(private CouponService $coupons) {}

    /**
     * Place one pre-order per farmer in the cart. Each group is
     * [farmer_profile_id, pickup_slot_id, pickup_date, note, items => [[product_id, quantity]]].
     *
     * @return Collection<int, Order>
     */
    public function place(User $customer, array $groups): Collection
    {
        // A double-clicked "Place order" (or two tabs) must not create two orders:
        // only one checkout per customer may run at a time.
        $lock = Cache::lock("checkout:{$customer->id}", 15);
        if (! $lock->get()) {
            throw ValidationException::withMessages(['checkout' => 'Your previous checkout is still being processed. Please wait a moment.']);
        }

        try {
            $orders = $this->placeLocked($customer, $groups);
        } finally {
            $lock->release();
        }

        foreach ($orders as $order) {
            $order->load('farmer.user', 'market');
            $params = $this->params($order);
            $order->farmer->user->notify(new PlatformNotification('order_placed', $params, route('farmer.orders.show', $order), true));
            $customer->notify(new PlatformNotification('order_confirmation', $params, route('customer.orders.show', $order), true));
        }

        return $orders;
    }

    private function placeLocked(User $customer, array $groups): Collection
    {
        // Lock stalls in id order so two carts spanning the same farmers cannot deadlock.
        $groups = collect($groups)->sortBy('farmer_profile_id')->values()->all();

        return DB::transaction(function () use ($customer, $groups) {
            return collect($groups)->map(function (array $group) use ($customer) {
                $farmer = FarmerProfile::approved()->findOrFail($group['farmer_profile_id']);
                $slot = $this->resolveSlot($farmer, (int) $group['pickup_slot_id'], $group['pickup_date']);
                $lines = $this->reserveStock($farmer, $group['items']);

                $order = Order::create([
                    'code' => $this->newCode(),
                    'customer_id' => $customer->id,
                    'farmer_profile_id' => $farmer->id,
                    'market_id' => $slot->market_id,
                    'pickup_slot_id' => $slot->id,
                    'pickup_date' => $group['pickup_date'],
                    'pickup_starts_at' => $slot->starts_at,
                    'pickup_ends_at' => $slot->ends_at,
                    'cutoff_at' => $slot->startsOn($group['pickup_date'])->subHours($farmer->order_cutoff_hours),
                    'status' => 'placed',
                    'total_amount' => $lines->sum('line_total'),
                    'items_count' => $lines->sum('quantity'),
                    'customer_note' => $group['note'] ?? null,
                ]);
                $order->items()->createMany($lines->all());
                $this->applyCoupon($order, $customer, $group['coupon'] ?? null);

                return $order;
            });
        }, attempts: 3);
    }

    /** Price the order (subtotal − coupon) with the coupon row locked; totals are always server-side. */
    private function applyCoupon(Order $order, User $customer, ?string $code): void
    {
        $subtotal = (float) $order->items()->sum('line_total');
        $discount = filled($code) ? $this->coupons->redeem($code, $order, $customer, $subtotal) : 0.0;

        $order->update([
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'coupon_code' => $discount > 0 ? strtoupper(trim($code)) : null,
            'total_amount' => round($subtotal - $discount, 2),
        ]);
    }

    /** Replace an order's lines and/or pickup window before the cut-off. */
    public function modify(Order $order, array $data): Order
    {
        DB::transaction(function () use ($order, $data) {
            // The farmer may accept or decline at the same moment: lock, reload, then decide.
            $order = $this->lockFresh($order);
            $this->ensureEditable($order);
            $farmer = $order->farmer;
            $this->releaseStock($order);

            $slot = $this->resolveSlot($farmer, (int) $data['pickup_slot_id'], $data['pickup_date'], $order->id);
            $lines = $this->reserveStock($farmer, $data['items']);

            $order->items()->delete();
            $order->items()->createMany($lines->all());
            $order->update([
                'market_id' => $slot->market_id,
                'pickup_slot_id' => $slot->id,
                'pickup_date' => $data['pickup_date'],
                'pickup_starts_at' => $slot->starts_at,
                'pickup_ends_at' => $slot->ends_at,
                'cutoff_at' => $slot->startsOn($data['pickup_date'])->subHours($farmer->order_cutoff_hours),
                'total_amount' => $lines->sum('line_total'),
                'items_count' => $lines->sum('quantity'),
                'customer_note' => $data['note'] ?? $order->customer_note,
                // A changed order goes back to the farmer for confirmation.
                'status' => 'placed',
                'accepted_at' => null,
            ]);

            // Keep the coupon if the new basket still qualifies; otherwise quietly drop it.
            $code = $order->coupon_code;
            $this->coupons->release($order);
            try {
                $this->applyCoupon($order, $order->customer, $code);
            } catch (ValidationException) {
                $this->applyCoupon($order, $order->customer, null);
            }
        }, attempts: 3);

        $order->refresh()->load('farmer.user', 'market');
        $order->farmer->user->notify(new PlatformNotification('order_modified', $this->params($order), route('farmer.orders.show', $order)));

        return $order;
    }

    public function cancel(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $order = $this->lockFresh($order);
            $this->ensureEditable($order);
            $this->releaseStock($order);
            $this->coupons->release($order);
            $order->update(['status' => 'cancelled', 'cancelled_at' => now()]);
        });

        $order->load('farmer.user', 'market');
        $order->farmer->user->notify(new PlatformNotification('order_cancelled', $this->params($order), route('farmer.orders.show', $order), true));
    }

    /** Farmer-side status change: accept, decline, mark ready, complete. */
    public function transition(Order $order, string $status, ?string $note = null): void
    {
        DB::transaction(function () use ($order, $status, $note) {
            // Re-read under lock: the customer may be cancelling this very order.
            $order = $this->lockFresh($order);
            if (! $order->canTransitionTo($status)) {
                throw ValidationException::withMessages(['status' => "Cannot move an order from {$order->status} to {$status}."]);
            }

            if ($status === 'declined') {
                $this->releaseStock($order);
                $this->coupons->release($order);
            }
            if ($status === 'completed') {
                foreach ($order->items as $item) {
                    Product::withTrashed()->whereKey($item->product_id)->increment('sold_count', $item->quantity);
                }
            }
            $order->update([
                'status' => $status,
                $status.'_at' => now(),
                'farmer_note' => $note ?: $order->farmer_note,
            ]);
        });

        $order->refresh()->load('customer', 'farmer', 'market');
        $order->customer->notify(new PlatformNotification(
            'order_'.$status,
            $this->params($order),
            route('customer.orders.show', $order),
            in_array($status, ['accepted', 'ready', 'declined'], true),
        ));
    }

    /** Available pickup windows for a farmer, grouped with their bookable dates. */
    public function availableSlots(FarmerProfile $farmer): Collection
    {
        return $farmer->pickupSlots()->where('is_active', true)->with('market:id,name,slug,address')
            ->orderBy('day_of_week')->orderBy('starts_at')->get()
            ->map(function (PickupSlot $slot) use ($farmer) {
                $booked = Order::where('pickup_slot_id', $slot->id)->whereIn('status', Order::OPEN)
                    ->selectRaw('pickup_date, count(*) as c')->groupBy('pickup_date')->pluck('c', 'pickup_date');
                $dates = collect($slot->upcomingDates($farmer->order_cutoff_hours))
                    ->reject(fn ($d) => ($booked[$d] ?? 0) >= $slot->capacity)->values();

                return [
                    'id' => $slot->id,
                    'day_of_week' => $slot->day_of_week,
                    'starts_at' => substr($slot->starts_at, 0, 5),
                    'ends_at' => substr($slot->ends_at, 0, 5),
                    'market' => $slot->market,
                    'dates' => $dates,
                ];
            })->filter(fn ($s) => $s['dates']->isNotEmpty())->values();
    }

    private function resolveSlot(FarmerProfile $farmer, int $slotId, string $date, ?int $ignoreOrderId = null): PickupSlot
    {
        // Locking the slot row serialises every booking for this window. Counting
        // orders FOR UPDATE alone would not stop two inserts into an empty range.
        $slot = $farmer->pickupSlots()->where('is_active', true)->lockForUpdate()->find($slotId);
        if (! $slot || ! in_array($date, $slot->upcomingDates($farmer->order_cutoff_hours), true)) {
            throw ValidationException::withMessages(['pickup' => "The pickup window for {$farmer->stall_name} is no longer available. Please pick another one."]);
        }

        $booked = Order::where('pickup_slot_id', $slot->id)->whereDate('pickup_date', $date)
            ->whereIn('status', Order::OPEN)
            ->when($ignoreOrderId, fn ($q) => $q->whereKeyNot($ignoreOrderId))
            ->count();
        if ($booked >= $slot->capacity) {
            throw ValidationException::withMessages(['pickup' => "That pickup window at {$farmer->stall_name} is fully booked."]);
        }

        return $slot;
    }

    /** Lock and decrement stock for each line; returns order_items rows. */
    private function reserveStock(FarmerProfile $farmer, array $items): Collection
    {
        // Merge duplicate lines for one product so the stock check sees the true total.
        $items = collect($items)->groupBy('product_id')
            ->map(fn ($lines, $id) => ['product_id' => (int) $id, 'quantity' => $lines->sum(fn ($l) => (int) $l['quantity'])])
            ->filter(fn ($i) => $i['quantity'] > 0)->values();
        if ($items->isEmpty()) {
            throw ValidationException::withMessages(['items' => 'Add at least one item.']);
        }

        $products = Product::whereIn('id', $items->pluck('product_id'))
            ->where('farmer_profile_id', $farmer->id)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

        return $items->map(function ($item) use ($products) {
            $product = $products->get($item['product_id']);
            $qty = (int) $item['quantity'];
            if (! $product || ! $product->isOrderable() || $product->stock_quantity < $qty) {
                $name = $product->name ?? 'An item';
                $left = $product?->stock_quantity ?? 0;
                throw ValidationException::withMessages(['items' => "{$name} only has {$left} left."]);
            }

            $product->stock_quantity -= $qty;
            if ($product->stock_quantity === 0) {
                $product->status = 'sold_out';
            }
            $product->save();

            return [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'unit' => $product->unit,
                'unit_price' => $product->price,
                'quantity' => $qty,
                'line_total' => round($product->price * $qty, 2),
            ];
        })->values();
    }

    private function releaseStock(Order $order): void
    {
        $qty = $order->items()->whereNotNull('product_id')->get()->groupBy('product_id')->map->sum('quantity');
        $products = Product::whereIn('id', $qty->keys())->orderBy('id')->lockForUpdate()->get();

        foreach ($products as $product) {
            $product->stock_quantity += $qty[$product->id];
            if ($product->status === 'sold_out') {
                $product->status = 'available';
            }
            $product->save();
        }
    }

    private function lockFresh(Order $order): Order
    {
        return Order::whereKey($order->id)->lockForUpdate()->with('items', 'farmer', 'customer')->firstOrFail();
    }

    private function ensureEditable(Order $order): void
    {
        if (! $order->isEditableByCustomer()) {
            throw ValidationException::withMessages(['order' => 'This order can no longer be changed — the farmer\'s cut-off has passed.']);
        }
    }

    private function newCode(): string
    {
        do {
            $code = 'GG-'.strtoupper(Str::random(6));
        } while (Order::where('code', $code)->exists());

        return $code;
    }

    private function params(Order $order): array
    {
        return [
            'code' => $order->code,
            'date' => $order->pickup_date->toDateString(),
            'farmer' => $order->farmer->stall_name,
            'market' => $order->market->name,
        ];
    }
}
