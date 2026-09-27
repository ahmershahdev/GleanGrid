<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\FarmerProfile;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\PlatformNotification;
use App\Services\OrderService;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PlatformControlsTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private User $customer;

    private User $admin;

    private FarmerProfile $farmer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = User::where('email', 'customer@gleangrid.test')->first();
        $this->admin = User::where('email', 'admin@gleangrid.test')->first();
        $this->farmer = FarmerProfile::where('slug', 'hilltop-bakehouse')->first();
    }

    private function place(User $customer, int $qty = 2): Order
    {
        $slot = app(OrderService::class)->availableSlots($this->farmer)->first();
        $product = $this->farmer->products()->orderable()->first();
        $this->actingAs($customer)->post(route('customer.checkout.store'), ['groups' => [[
            'farmer_profile_id' => $this->farmer->id, 'pickup_slot_id' => $slot['id'], 'pickup_date' => $slot['dates'][0],
            'items' => [['product_id' => $product->id, 'quantity' => $qty]],
        ]]])->assertSessionHasNoErrors();

        return Order::latest('id')->first();
    }

    private function windowOver(Order $order): void
    {
        $order->forceFill(['pickup_date' => now()->subDay()->toDateString(), 'cutoff_at' => now()->subDays(2)])->save();
    }

    public function test_status_history_is_recorded_by_the_database_trigger(): void
    {
        $order = $this->place($this->customer);
        $this->actingAs($this->farmer->user)->patch(route('farmer.orders.status', $order), ['status' => 'accepted']);

        $history = DB::table('order_status_history')->where('order_id', $order->id)->orderBy('id')->get();
        $this->assertSame([null, 'placed'], [$history[0]->from_status, $history[0]->to_status]);
        $this->assertSame(['placed', 'accepted'], [$history[1]->from_status, $history[1]->to_status]);

        DB::table('orders')->where('id', $order->id)->update(['status' => 'ready']);
        $this->assertSame('ready', DB::table('order_status_history')->where('order_id', $order->id)->latest('id')->value('to_status'));
    }

    public function test_no_show_only_after_the_window_and_it_releases_stock(): void
    {
        $order = $this->place($this->customer, 3);
        $product = Product::find($order->items()->value('product_id'));
        $stock = $product->stock_quantity;
        $farmerUser = $this->farmer->user;
        $this->actingAs($farmerUser)->patch(route('farmer.orders.status', $order), ['status' => 'accepted']);

        $this->actingAs($farmerUser)->patch(route('farmer.orders.status', $order), ['status' => 'no_show'])->assertSessionHasErrors('status');

        $this->windowOver($order);
        Notification::fake();
        $this->actingAs($farmerUser)->patch(route('farmer.orders.status', $order), ['status' => 'no_show'])->assertSessionHasNoErrors();

        $this->assertSame('no_show', $order->fresh()->status);
        $this->assertSame($stock + 3, $product->fresh()->stock_quantity);
        $this->assertSame(1, $this->customer->fresh()->no_show_count);
        Notification::assertSentTo($this->customer, PlatformNotification::class, fn ($n) => $n->key === 'order_no_show');
    }

    public function test_repeated_no_shows_pause_pre_ordering_until_an_admin_resets(): void
    {
        Settings::put(['no_show_limit' => 2]);
        foreach (range(1, 2) as $i) {
            $order = $this->place($this->customer, 1);
            $this->actingAs($this->farmer->user)->patch(route('farmer.orders.status', $order), ['status' => 'accepted']);
            $this->windowOver($order);
            $this->actingAs($this->farmer->user)->patch(route('farmer.orders.status', $order), ['status' => 'no_show'])->assertSessionHasNoErrors();
        }
        $this->assertTrue($this->customer->fresh()->preorderRestricted());

        $slot = app(OrderService::class)->availableSlots($this->farmer)->first();
        $this->actingAs($this->customer)->post(route('customer.checkout.store'), ['groups' => [[
            'farmer_profile_id' => $this->farmer->id, 'pickup_slot_id' => $slot['id'], 'pickup_date' => $slot['dates'][0],
            'items' => [['product_id' => $this->farmer->products()->orderable()->value('id'), 'quantity' => 1]],
        ]]])->assertSessionHasErrors('checkout');

        $this->actingAs($this->admin)->patch(route('admin.customers.no-shows.reset', $this->customer))->assertSessionHasNoErrors();
        $this->assertFalse($this->customer->fresh()->preorderRestricted());
        $this->assertDatabaseHas('audit_logs', ['action' => 'customer.no_shows_reset', 'subject_id' => $this->customer->id]);
    }

    public function test_pickup_reminders_are_sent_once_for_tomorrows_orders(): void
    {
        $order = $this->place($this->customer);
        $order->forceFill(['pickup_date' => now()->addDay()->toDateString()])->save();
        Order::whereKeyNot($order->id)->update(['reminder_sent_at' => now()]);
        Notification::fake();

        $this->artisan('gleangrid:send-pickup-reminders', ['--force' => true])->assertSuccessful();
        $this->artisan('gleangrid:send-pickup-reminders', ['--force' => true])->assertSuccessful();

        Notification::assertSentToTimes($this->customer, PlatformNotification::class, 1);
        $this->assertNotNull($order->fresh()->reminder_sent_at);
    }

    public function test_farmer_can_open_their_own_order_from_a_scanned_pass_only(): void
    {
        $order = $this->place($this->customer);

        $this->actingAs($this->farmer->user)->get(route('farmer.orders.lookup', ['code' => route('farmer.orders.show', $order)]))
            ->assertRedirect(route('farmer.orders.show', $order));
        $this->actingAs($this->farmer->user)->get(route('farmer.orders.lookup', ['code' => strtolower($order->code)]))
            ->assertRedirect(route('farmer.orders.show', $order));

        $other = FarmerProfile::approved()->where('id', '!=', $this->farmer->id)->first()->user;
        $this->actingAs($other)->from(route('farmer.scan'))->get(route('farmer.orders.lookup', ['code' => $order->code]))
            ->assertRedirect(route('farmer.scan'))->assertSessionHas('error', 'flash.order_not_found');
    }

    public function test_customer_can_download_their_data(): void
    {
        $response = $this->actingAs($this->customer)->get(route('profile.export'));
        $response->assertOk()->assertHeader('content-disposition');
        $data = json_decode($response->streamedContent(), true);

        $this->assertSame('customer@gleangrid.test', $data['account']['email']);
        $this->assertNotEmpty($data['orders']);
        $this->assertArrayNotHasKey('password', $data['account']);
    }

    public function test_account_deletion_anonymises_and_cancels_open_orders(): void
    {
        $user = User::create([
            'name' => 'Real Person', 'username' => 'realperson', 'email' => 'real@example.com', 'phone' => '+92 300 1234567',
            'address' => 'Somewhere, Hyderabad', 'role' => 'customer', 'password' => Hash::make('Str0ng!Pass'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $order = $this->place($user);

        $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'Str0ng!Pass', 'confirm' => 'nope'])->assertSessionHasErrors('confirm');
        $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'Str0ng!Pass', 'confirm' => 'DELETE'])->assertRedirect(route('home'));

        $user->refresh();
        $this->assertNotNull($user->anonymized_at);
        $this->assertSame('Deleted user', $user->name);
        $this->assertStringEndsWith('@deleted.invalid', $user->email);
        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertGuest();
    }

    public function test_demo_and_admin_accounts_cannot_be_self_deleted(): void
    {
        $this->actingAs($this->customer)->delete(route('profile.destroy'), ['password' => 'Customer@123', 'confirm' => 'DELETE'])
            ->assertSessionHas('error', 'flash.demo_cannot_delete');
        $this->assertNull($this->customer->fresh()->anonymized_at);
    }

    public function test_admin_settings_audit_log_and_order_override(): void
    {
        $this->actingAs($this->admin)->get(route('admin.settings.edit'))->assertOk();
        $this->actingAs($this->admin)->put(route('admin.settings.update'), [...Settings::all(), 'no_show_limit' => 5, 'farmer_registration_open' => false])->assertSessionHasNoErrors();
        $this->assertSame(5, Settings::get('no_show_limit'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.updated', 'user_id' => $this->admin->id]);

        auth()->logout();
        $this->post(route('register'), ['role' => 'farmer'])->assertSessionHasErrors('role');

        $order = $this->place($this->customer);
        $this->actingAs($this->admin)->get(route('admin.orders.show', $order))->assertOk();
        $this->actingAs($this->admin)->post(route('admin.orders.cancel', $order), ['reason' => 'Market closed for flooding'])->assertSessionHasNoErrors();
        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'order.cancelled', 'subject_type' => 'order', 'subject_id' => $order->id]);

        $this->actingAs($this->admin)->patch(route('admin.farmers.status', $this->farmer), ['status' => 'suspended', 'reason' => 'Test'])->assertSessionHasNoErrors();
        $this->assertSame(1, AuditLog::where('action', 'farmer.suspended')->count());
        $this->actingAs($this->admin)->get(route('admin.audit.index'))->assertOk();

        $this->actingAs($this->customer)->get(route('admin.audit.index'))->assertForbidden();
    }
}
