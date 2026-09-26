<?php

namespace Tests\Feature;

use App\Models\FarmerProfile;
use App\Models\Favorite;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderFlowTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private User $customer;

    private FarmerProfile $farmer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = User::where('email', 'customer@gleangrid.test')->first();
        $this->farmer = FarmerProfile::where('slug', 'hilltop-bakehouse')->first();
    }

    /** First bookable [slot, date] for the farmer. */
    private function window(): array
    {
        $slot = app(OrderService::class)->availableSlots($this->farmer)->first();

        return [$slot['id'], $slot['dates'][0]];
    }

    private function place(Product $product, int $qty = 2): Order
    {
        [$slotId, $date] = $this->window();
        $this->actingAs($this->customer)->post(route('customer.checkout.store'), ['groups' => [[
            'farmer_profile_id' => $this->farmer->id, 'pickup_slot_id' => $slotId, 'pickup_date' => $date,
            'items' => [['product_id' => $product->id, 'quantity' => $qty]],
        ]]])->assertRedirect(route('customer.orders.index'));

        return Order::latest('id')->first();
    }

    public function test_full_pre_order_lifecycle(): void
    {
        $product = $this->farmer->products()->orderable()->first();
        $stock = $product->stock_quantity;

        $order = $this->place($product, 2);
        $this->assertSame('placed', $order->status);
        $this->assertSame($stock - 2, $product->fresh()->stock_quantity);
        $this->assertEquals($product->price * 2, $order->total_amount);

        $farmerUser = $this->farmer->user;
        foreach (['accepted', 'ready', 'completed'] as $status) {
            $this->actingAs($farmerUser)->patch(route('farmer.orders.status', $order), ['status' => $status])->assertSessionHasNoErrors();
            $this->assertSame($status, $order->fresh()->status);
        }
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->customer->id]);

        $this->actingAs($this->customer)->post(route('customer.reviews.store', $order), ['type' => 'farmer', 'id' => $this->farmer->id, 'rating' => 5, 'comment' => 'Lovely'])
            ->assertSessionHasNoErrors();
        $this->assertDatabaseHas('reviews', ['order_id' => $order->id, 'rating' => 5]);
    }

    public function test_cancelling_releases_stock(): void
    {
        $product = $this->farmer->products()->orderable()->first();
        $stock = $product->stock_quantity;
        $order = $this->place($product, 3);

        $this->actingAs($this->customer)->post(route('customer.orders.cancel', $order))->assertSessionHasNoErrors();

        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame($stock, $product->fresh()->stock_quantity);
    }

    public function test_cannot_order_more_than_stock(): void
    {
        $product = $this->farmer->products()->orderable()->first();
        [$slotId, $date] = $this->window();

        $this->actingAs($this->customer)->post(route('customer.checkout.store'), ['groups' => [[
            'farmer_profile_id' => $this->farmer->id, 'pickup_slot_id' => $slotId, 'pickup_date' => $date,
            'items' => [['product_id' => $product->id, 'quantity' => $product->stock_quantity + 1]],
        ]]])->assertSessionHasErrors('items');
    }

    public function test_orders_lock_after_cutoff(): void
    {
        $order = $this->place($this->farmer->products()->orderable()->first(), 1);
        $order->update(['cutoff_at' => now()->subMinute()]);

        $this->actingAs($this->customer)->post(route('customer.orders.cancel', $order))->assertSessionHasErrors('order');
        $this->assertSame('placed', $order->fresh()->status);
    }

    public function test_farmer_cannot_skip_status_steps(): void
    {
        $order = $this->place($this->farmer->products()->orderable()->first(), 1);

        $this->actingAs($this->farmer->user)->patch(route('farmer.orders.status', $order), ['status' => 'completed'])->assertSessionHasErrors('status');
    }

    public function test_restock_notifies_favoriters(): void
    {
        $product = $this->farmer->products()->first();
        $product->update(['status' => 'sold_out', 'stock_quantity' => 0]);
        Favorite::create(['user_id' => $this->customer->id, 'favoritable_type' => 'product', 'favoritable_id' => $product->id]);

        $this->actingAs($this->farmer->user)->patch(route('farmer.products.status', $product), ['status' => 'available', 'stock_quantity' => 10]);

        $this->assertTrue($this->customer->notifications()->where('data->key', 'restock')->exists());
    }

    public function test_pending_farmer_cannot_list_products(): void
    {
        $pending = FarmerProfile::where('status', 'pending')->first()->user;

        $this->actingAs($pending)->get(route('farmer.products.index'))->assertRedirect(route('farmer.dashboard'));
    }

    public function test_deactivated_customer_cannot_sign_in(): void
    {
        $this->post(route('login'), ['login' => 'spam@gleangrid.test', 'password' => 'Customer@123'])->assertSessionHasErrors('login');
        $this->assertGuest();
    }
}
