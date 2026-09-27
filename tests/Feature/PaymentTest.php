<?php

namespace Tests\Feature;

use App\Models\FarmerProfile;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Payments\GatewayResult;
use App\Payments\JazzCashGateway;
use App\Services\OrderService;
use App\Services\PaymentService;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PaymentTest extends TestCase
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

    private function group(int $qty = 1): array
    {
        $product = $this->farmer->products()->orderable()->where('stock_quantity', '>=', 5)->first();
        $slot = $this->orders->availableSlots($this->farmer)->first();

        return ['farmer_profile_id' => $this->farmer->id, 'pickup_slot_id' => $slot['id'], 'pickup_date' => $slot['dates'][0], 'items' => [['product_id' => $product->id, 'quantity' => $qty]]];
    }

    private function checkout(string $method = 'card', int $qty = 1): Payment
    {
        $this->actingAs($this->customer)
            ->post(route('customer.checkout.store'), ['groups' => [$this->group($qty)], 'payment_method' => $method])
            ->assertRedirect();

        return Payment::where('user_id', $this->customer->id)->latest('id')->firstOrFail();
    }

    private function card(string $number = '4242 4242 4242 4242'): array
    {
        return ['method' => 'card', 'idempotency_key' => (string) Str::uuid(), 'card_name' => 'Ayesha Malik', 'card_number' => $number, 'card_expiry' => '12/'.now()->addYears(2)->format('y'), 'card_cvc' => '123'];
    }

    public function test_online_checkout_holds_stock_and_waits_for_payment(): void
    {
        $payment = $this->checkout('card', 2);
        $order = $payment->orders()->first();

        $this->assertSame('pending', $payment->status);
        $this->assertSame('pending', $order->payment_status);
        $this->assertSame('card', $order->payment_method);
        $this->assertEquals($order->total_amount, $payment->amount);
        $this->assertTrue($payment->expires_at->isFuture());

        $this->actingAs($this->farmer->user)
            ->patch(route('farmer.orders.status', $order), ['status' => 'accepted'])
            ->assertSessionHasErrors('status');
    }

    public function test_a_valid_card_pays_every_order_in_the_checkout(): void
    {
        $payment = $this->checkout();

        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), $this->card())
            ->assertRedirect(route('customer.payments.show', $payment));

        $payment->refresh();
        $this->assertSame('paid', $payment->status);
        $this->assertSame('4242', $payment->card_last4);
        $this->assertSame('visa', $payment->card_brand);
        $this->assertNotNull($payment->provider_ref);
        $this->assertSame('paid', $payment->orders()->first()->payment_status);
        $this->assertDatabaseMissing('payment_events', ['message' => '4242424242424242']);
    }

    public function test_a_declined_card_can_be_retried_and_the_card_number_is_never_stored(): void
    {
        $payment = $this->checkout();

        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), $this->card('4000 0000 0000 0002'));
        $payment->refresh();
        $this->assertSame('pending', $payment->status);
        $this->assertSame('card_declined', $payment->failure_reason);
        $this->assertSame(1, $payment->attempts);

        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), $this->card());
        $this->assertSame('paid', $payment->fresh()->status);

        $columns = collect(Payment::first()->getAttributes())->implode(' ');
        $this->assertStringNotContainsString('4242424242424242', $columns);
        $this->assertStringNotContainsString('123', (string) $payment->fresh()->card_last4);
    }

    public function test_invalid_card_details_are_rejected_before_reaching_the_gateway(): void
    {
        $payment = $this->checkout();

        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), [...$this->card('4242 4242 4242 4241')])
            ->assertSessionHasErrors('card_number');
        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), [...$this->card(), 'card_expiry' => '01/20'])
            ->assertSessionHasErrors('card_expiry');
        $this->assertSame(0, $payment->fresh()->attempts);
    }

    public function test_a_double_submit_with_the_same_key_charges_only_once(): void
    {
        $payment = $this->checkout();
        $body = $this->card();

        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), $body);
        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), $body);

        $this->assertSame(1, $payment->fresh()->attempts);
        $this->assertSame(1, $payment->events()->where('type', 'captured')->count());
    }

    public function test_a_payment_that_is_already_processing_cannot_be_started_again(): void
    {
        $payment = $this->checkout('easypaisa');
        $service = app(PaymentService::class);

        $service->start($payment, $this->customer, 'easypaisa', ['msisdn' => '03001234567'], (string) Str::uuid());
        $this->assertSame('processing', $payment->fresh()->status);

        $this->expectException(ValidationException::class);
        $service->start($payment->fresh(), $this->customer, 'card', ['card_number' => '4242424242424242'], (string) Str::uuid());
    }

    public function test_wallet_payments_complete_after_the_customer_approves(): void
    {
        config(['payments.wallet_approval_seconds' => 0]);
        $payment = $this->checkout('jazzcash');

        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), ['method' => 'jazzcash', 'idempotency_key' => (string) Str::uuid(), 'msisdn' => '03001234567']);
        $this->assertSame('processing', $payment->fresh()->status);
        $this->assertSame('0300•••4567', $payment->fresh()->wallet_msisdn);

        $this->actingAs($this->customer)->getJson(route('customer.payments.status', $payment))
            ->assertOk()->assertJsonPath('payment.status', 'paid');
    }

    public function test_a_rejected_wallet_request_returns_the_payment_to_pending(): void
    {
        config(['payments.wallet_approval_seconds' => 0]);
        $payment = $this->checkout('easypaisa');

        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), ['method' => 'easypaisa', 'idempotency_key' => (string) Str::uuid(), 'msisdn' => '03001230000']);
        $this->actingAs($this->customer)->getJson(route('customer.payments.status', $payment))->assertJsonPath('payment.status', 'pending');
        $this->assertSame('wallet_rejected', $payment->fresh()->failure_reason);
    }

    public function test_other_customers_cannot_see_or_pay_a_payment(): void
    {
        $payment = $this->checkout();
        $other = User::where('role', 'customer')->where('id', '!=', $this->customer->id)->where('status', 'active')->first();

        $this->actingAs($other)->get(route('customer.payments.show', $payment))->assertNotFound();
        $this->actingAs($other)->post(route('customer.payments.pay', $payment), $this->card())->assertNotFound();
        $this->actingAs($other)->getJson(route('customer.payments.status', $payment))->assertNotFound();
        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_an_expired_checkout_releases_stock_and_cancels_orders(): void
    {
        $payment = $this->checkout('card', 3);
        $order = $payment->orders()->with('items')->first();
        $product = Product::find($order->items->first()->product_id);
        $before = $product->stock_quantity;

        $payment->update(['expires_at' => now()->subMinute()]);
        $this->artisan('gleangrid:expire-payments')->assertSuccessful();

        $this->assertSame('expired', $payment->fresh()->status);
        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame('failed', $order->fresh()->payment_status);
        $this->assertSame($before + 3, $product->fresh()->stock_quantity);

        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), $this->card())->assertSessionHasErrors('payment');
    }

    public function test_cancelling_a_paid_order_refunds_it(): void
    {
        $payment = $this->checkout();
        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), $this->card());
        $order = $payment->orders()->first();

        $this->actingAs($this->customer)->post(route('customer.orders.cancel', $order))->assertRedirect();

        $this->assertSame('refunded', $order->fresh()->payment_status);
        $this->assertSame('refunded', $payment->fresh()->status);
        $this->assertEquals($payment->amount, $payment->fresh()->refunded_amount);
    }

    public function test_a_farmer_decline_refunds_and_a_second_refund_is_a_no_op(): void
    {
        $payment = $this->checkout();
        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), $this->card());
        $order = $payment->orders()->first();

        $this->orders->transition($order, 'declined', 'Out of stock');
        $this->orders->refund($order->fresh(), 'again');

        $this->assertEquals($payment->amount, $payment->fresh()->refunded_amount);
        $this->assertSame(1, $payment->events()->where('type', 'refund')->count());
    }

    public function test_a_late_gateway_success_after_expiry_is_refunded_automatically(): void
    {
        $payment = $this->checkout();
        $service = app(PaymentService::class);
        $payment->update(['status' => 'expired']);

        $service->apply($payment, GatewayResult::succeeded('LATE-1'));

        $this->assertSame('refunded', $payment->fresh()->status);
        $this->assertSame(1, $payment->events()->where('type', 'late_capture')->count());
    }

    public function test_disabled_methods_cannot_be_used(): void
    {
        Settings::put(['payments_card_enabled' => false]);

        $this->actingAs($this->customer)
            ->post(route('customer.checkout.store'), ['groups' => [$this->group()], 'payment_method' => 'card'])
            ->assertSessionHasErrors('payment_method');
        $this->assertSame(0, Payment::count());
    }

    public function test_admin_can_list_view_and_refund_payments(): void
    {
        $payment = $this->checkout();
        $this->actingAs($this->customer)->post(route('customer.payments.pay', $payment), $this->card());
        $admin = User::where('role', 'admin')->first();

        $this->actingAs($admin)->get(route('admin.payments.index'))->assertOk();
        $this->actingAs($admin)->get(route('admin.payments.show', $payment))->assertOk();
        $this->actingAs($admin)->post(route('admin.payments.refund', $payment), ['reason' => 'Produce was damaged'])->assertRedirect();

        $this->assertSame('refunded', $payment->fresh()->status);
        $this->assertSame('cancelled', $payment->orders()->first()->status);
        $this->actingAs($this->customer)->get(route('admin.payments.index'))->assertForbidden();
    }

    public function test_jazzcash_callbacks_must_carry_a_valid_signature(): void
    {
        config(['payments.mode' => 'live', 'payments.jazzcash' => ['merchant_id' => 'MC1', 'password' => 'pw', 'integrity_salt' => 'salt123', 'endpoint' => 'https://sandbox.jazzcash.com.pk/x']]);
        $payment = Payment::create([
            'reference' => 'PAY-TESTJAZZ01', 'user_id' => $this->customer->id, 'method' => 'jazzcash', 'provider' => 'jazzcash',
            'status' => 'processing', 'amount' => 500, 'provider_ref' => 'T123', 'expires_at' => now()->addMinutes(10), 'processing_started_at' => now(),
        ]);
        $gateway = new JazzCashGateway(config('payments.jazzcash'));
        $payload = ['pp_TxnRefNo' => 'T123', 'pp_Amount' => '50000', 'pp_ResponseCode' => '000', 'pp_RetreivalReferenceNo' => 'R9'];

        $this->post(route('payments.callback', 'jazzcash'), [...$payload, 'pp_SecureHash' => 'FORGED'])->assertForbidden();
        $this->assertSame('processing', $payment->fresh()->status);

        $this->post(route('payments.callback', 'jazzcash'), [...$payload, 'pp_Amount' => '1', 'pp_SecureHash' => $gateway->sign([...$payload, 'pp_Amount' => '1'])])->assertStatus(422);

        $this->post(route('payments.callback', 'jazzcash'), [...$payload, 'pp_SecureHash' => $gateway->sign($payload)])->assertRedirect();
        $this->assertSame('paid', $payment->fresh()->status);
    }

    public function test_orders_awaiting_payment_cannot_be_edited_or_cancelled_directly(): void
    {
        $payment = $this->checkout();
        $order = $payment->orders()->first();

        $this->actingAs($this->customer)->post(route('customer.orders.cancel', $order))->assertSessionHasErrors('order');
        $this->actingAs($this->customer)->post(route('customer.payments.cancel', $payment))->assertRedirect(route('customer.orders.index'));
        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame(Order::class, $order::class);
    }
}
