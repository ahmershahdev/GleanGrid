<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\FarmerProfile;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CouponTest extends TestCase
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

    private function coupon(array $attrs = []): Coupon
    {
        return Coupon::create([
            'farmer_profile_id' => $this->farmer->id, 'code' => 'TEST10', 'type' => 'percent', 'value' => 10,
            'min_subtotal' => 0, 'per_customer_limit' => 5, 'is_active' => true, ...$attrs,
        ]);
    }

    private function group(?string $coupon, int $qty = 2): array
    {
        $product = $this->farmer->products()->orderable()->orderByDesc('price')->first();
        $slot = $this->orders->availableSlots($this->farmer)->first();

        return ['farmer_profile_id' => $this->farmer->id, 'pickup_slot_id' => $slot['id'], 'pickup_date' => $slot['dates'][0], 'coupon' => $coupon, 'items' => [['product_id' => $product->id, 'quantity' => $qty]]];
    }

    public function test_a_coupon_discounts_the_order_and_is_recorded(): void
    {
        $coupon = $this->coupon();
        $order = $this->orders->place($this->customer, [$this->group('test10')])->first();

        $this->assertEqualsWithDelta($order->subtotal * 0.10, $order->discount_amount, 0.01);
        $this->assertEqualsWithDelta($order->subtotal - $order->discount_amount, $order->total_amount, 0.01);
        $this->assertSame('TEST10', $order->coupon_code);
        $this->assertSame(1, $coupon->fresh()->used_count);
    }

    public function test_usage_limit_is_enforced_and_cancel_gives_the_use_back(): void
    {
        $coupon = $this->coupon(['usage_limit' => 1]);
        $order = $this->orders->place($this->customer, [$this->group('TEST10')])->first();

        $other = User::where('email', 'zara@gleangrid.test')->first();
        try {
            $this->orders->place($other, [$this->group('TEST10')]);
            $this->fail('The second redemption must be refused.');
        } catch (ValidationException $e) {
            $this->assertSame('coupon.used_up', $e->errors()['coupon'][0]);
        }

        $this->orders->cancel($order);
        $this->assertSame(0, $coupon->fresh()->used_count);
        $this->assertCount(1, $this->orders->place($other, [$this->group('TEST10')]));
    }

    public function test_per_customer_limit_minimum_and_wrong_stall(): void
    {
        $this->coupon(['per_customer_limit' => 1, 'min_subtotal' => 1]);
        $this->orders->place($this->customer, [$this->group('TEST10')]);

        $this->expectExceptionObject(ValidationException::withMessages(['coupon' => 'coupon.already_used']));
        $this->orders->place($this->customer, [$this->group('TEST10')]);
    }

    public function test_a_code_from_another_stall_is_rejected(): void
    {
        $this->coupon(['farmer_profile_id' => FarmerProfile::where('slug', 'green-acres-organic-farm')->value('id'), 'code' => 'OTHER5']);

        $this->expectException(ValidationException::class);
        $this->orders->place($this->customer, [$this->group('OTHER5')]);
    }

    public function test_preview_endpoint_prices_from_the_server(): void
    {
        $this->coupon(['type' => 'fixed', 'value' => 50]);
        $group = $this->group(null);

        $this->actingAs($this->customer)->postJson(route('customer.coupons.preview'), [
            'code' => 'TEST10', 'farmer_profile_id' => $this->farmer->id, 'items' => $group['items'],
        ])->assertOk()->assertJson(['code' => 'TEST10', 'discount' => 50]);
    }

    public function test_farmers_manage_only_their_own_coupons(): void
    {
        $mine = $this->coupon();
        $theirs = Coupon::create(['farmer_profile_id' => FarmerProfile::where('slug', 'green-acres-organic-farm')->value('id'), 'code' => 'NOTYOURS', 'type' => 'fixed', 'value' => 20, 'per_customer_limit' => 1]);

        $this->actingAs($this->farmer->user)->put(route('farmer.coupons.update', $mine), ['toggle' => 1])->assertRedirect();
        $this->assertFalse($mine->fresh()->is_active);
        $this->actingAs($this->farmer->user)->put(route('farmer.coupons.update', $theirs), ['toggle' => 1])->assertForbidden();

        $this->actingAs($this->farmer->user)->post(route('farmer.coupons.store'), [
            'code' => 'bread-lovers', 'type' => 'percent', 'value' => 150, 'per_customer_limit' => 1,
        ])->assertSessionHasErrors('value');
    }
}
