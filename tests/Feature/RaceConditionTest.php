<?php

namespace Tests\Feature;

use App\Models\FarmerProfile;
use App\Models\Favorite;
use App\Models\Order;
use App\Models\PickupSlot;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RaceConditionTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private User $customer;

    private FarmerProfile $farmer;

    private OrderService $orders;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = User::where('email', 'customer@gleangrid.test')->first();
        $this->farmer = FarmerProfile::where('slug', 'hilltop-bakehouse')->first();
        $this->orders = app(OrderService::class);
    }

    private function group(Product $product, int $qty = 1, ?array $window = null): array
    {
        $slot = $this->orders->availableSlots($this->farmer)->first();
        [$slotId, $date] = $window ?? [$slot['id'], $slot['dates'][0]];

        return ['farmer_profile_id' => $this->farmer->id, 'pickup_slot_id' => $slotId, 'pickup_date' => $date, 'items' => [['product_id' => $product->id, 'quantity' => $qty]]];
    }

    public function test_a_second_checkout_while_one_is_running_is_refused(): void
    {
        $product = $this->farmer->products()->orderable()->first();
        $held = Cache::lock("checkout:{$this->customer->id}", 15);
        $this->assertTrue($held->get());

        try {
            $this->orders->place($this->customer, [$this->group($product)]);
            $this->fail('A parallel checkout must not go through.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('checkout', $e->errors());
        } finally {
            $held->release();
        }

        $this->assertCount(1, $this->orders->place($this->customer, [$this->group($product)]));
    }

    public function test_cancelling_a_stale_order_re_checks_the_status_under_lock(): void
    {
        $product = $this->farmer->products()->orderable()->first();
        $order = $this->orders->place($this->customer, [$this->group($product, 2)])->first();
        $stock = $product->fresh()->stock_quantity;

        Order::whereKey($order->id)->update(['status' => 'declined']);

        $this->expectException(ValidationException::class);
        try {
            $this->orders->cancel($order);
        } finally {
            $this->assertSame($stock, $product->fresh()->stock_quantity);
        }
    }

    public function test_farmer_transition_uses_fresh_status(): void
    {
        $product = $this->farmer->products()->orderable()->first();
        $order = $this->orders->place($this->customer, [$this->group($product)])->first();

        Order::whereKey($order->id)->update(['status' => 'cancelled']);

        $this->expectException(ValidationException::class);
        $this->orders->transition($order, 'accepted');
    }

    public function test_full_pickup_window_rejects_the_next_booking(): void
    {
        $product = $this->farmer->products()->orderable()->first();
        $slot = $this->orders->availableSlots($this->farmer)->first();
        $window = [$slot['id'], $slot['dates'][0]];
        $booked = Order::where('pickup_slot_id', $slot['id'])->whereDate('pickup_date', $window[1])->whereIn('status', Order::OPEN)->count();
        PickupSlot::whereKey($slot['id'])->update(['capacity' => $booked + 1]);

        $this->orders->place($this->customer, [$this->group($product, 1, $window)]);

        $other = User::where('email', 'zara@gleangrid.test')->first();
        $this->expectException(ValidationException::class);
        $this->orders->place($other, [$this->group($product, 1, $window)]);
    }

    public function test_duplicate_lines_cannot_sneak_past_the_stock_check(): void
    {
        $product = $this->farmer->products()->orderable()->first();
        $product->update(['stock_quantity' => 3]);
        $group = $this->group($product, 2);
        $group['items'][] = ['product_id' => $product->id, 'quantity' => 2];

        $this->expectException(ValidationException::class);
        $this->orders->place($this->customer, [$group]);
    }

    public function test_favourite_toggle_is_idempotent(): void
    {
        $product = Product::listed()->first();
        $row = ['user_id' => $this->customer->id, 'favoritable_type' => 'product', 'favoritable_id' => $product->id, 'notify_restock' => true, 'created_at' => now(), 'updated_at' => now()];

        Favorite::insertOrIgnore($row);
        Favorite::insertOrIgnore($row);

        $this->assertSame(1, Favorite::where('user_id', $this->customer->id)->where('favoritable_type', 'product')->where('favoritable_id', $product->id)->count());
    }

    public function test_database_rejects_impossible_values(): void
    {
        $this->expectException(QueryException::class);
        DB::table('reviews')->insert([
            'user_id' => $this->customer->id, 'reviewable_type' => 'farmer', 'reviewable_id' => $this->farmer->id,
            'rating' => 9, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_a_farmer_editing_stale_stock_does_not_erase_sales_made_meanwhile(): void
    {
        $product = $this->farmer->products()->where('status', 'available')->firstOrFail();
        $product->update(['stock_quantity' => 10]);
        $this->orders->place($this->customer, [$this->group($product, 2)]);
        $this->assertSame(8, $product->fresh()->stock_quantity);

        $this->actingAs($this->farmer->user)->patch(route('farmer.products.status', $product), ['status' => 'available', 'stock_quantity' => 15, 'stock_seen' => 10]);
        $this->assertSame(13, $product->fresh()->stock_quantity);

        $this->actingAs($this->farmer->user)->patch(route('farmer.products.status', $product), ['status' => 'available', 'stock_quantity' => 10, 'stock_seen' => 10]);
        $this->assertSame(13, $product->fresh()->stock_quantity);
    }

    public function test_weekly_restock_is_a_single_atomic_update(): void
    {
        $product = $this->farmer->products()->where('weekly_quantity', '>', 0)->where('status', '!=', 'unavailable')->firstOrFail();
        $product->update(['stock_quantity' => 0, 'status' => 'sold_out']);

        $this->artisan('gleangrid:restock-weekly')->assertSuccessful();

        $fresh = $product->fresh();
        $this->assertSame($fresh->weekly_quantity, $fresh->stock_quantity);
        $this->assertSame('available', $fresh->status);
    }
}
