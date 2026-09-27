<?php

use App\Models\Coupon;
use App\Models\FarmerProfile;
use App\Models\Order;
use App\Models\PickupSlot;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (($argv[1] ?? '') === 'buy') {
    [, , $customerId, $groupJson, $startAt] = $argv;
    while (microtime(true) < (float) $startAt) {
        usleep(200);
    }
    try {
        app(OrderService::class)->place(User::findOrFail($customerId), [json_decode($groupJson, true)]);
        echo 'OK';
    } catch (ValidationException $e) {
        echo 'REJECTED '.collect($e->errors())->flatten()->first();
    } catch (Throwable $e) {
        echo 'ERROR '.get_class($e).': '.$e->getMessage();
    }
    exit;
}

$buyers = (int) ($argv[1] ?? 20);
$tag = 'race'.now()->format('His');
$farmer = FarmerProfile::approved()->whereHas('markets')->firstOrFail();
$market = $farmer->markets()->firstOrFail();
$day = now()->addDays(3)->dayOfWeek;
$date = now()->addDays(3)->toDateString();

$customers = collect(range(1, $buyers))->map(fn ($i) => User::create([
    'role' => 'customer', 'name' => "Race Buyer {$i}", 'username' => "{$tag}_{$i}", 'email' => "{$tag}_{$i}@race.test",
    'phone' => '0300000000', 'address' => 'Test', 'password' => Hash::make('Race@12345'), 'email_verified_at' => now(),
]));

$fixtures = ['slots' => [], 'products' => [], 'coupons' => []];
$slot = function (int $capacity) use (&$fixtures, $farmer, $market, $day) {
    return $fixtures['slots'][] = PickupSlot::create([
        'farmer_profile_id' => $farmer->id, 'market_id' => $market->id, 'day_of_week' => $day,
        'starts_at' => '06:00', 'ends_at' => '07:00', 'capacity' => $capacity, 'is_active' => true,
    ]);
};
$product = function (int $stock) use (&$fixtures, $farmer, $tag) {
    return $fixtures['products'][] = Product::create([
        'farmer_profile_id' => $farmer->id, 'category_id' => $farmer->products()->value('category_id'), 'name' => "Race item {$tag} ".count($fixtures['products']),
        'slug' => "{$tag}-item-".count($fixtures['products']), 'price' => 100, 'unit' => 'kg', 'stock_quantity' => $stock, 'weekly_quantity' => $stock,
        'status' => 'available', 'image' => 'produce:tomato',
    ]);
};

function race(string $label, $customers, callable $group): array
{
    $startAt = microtime(true) + 1.5;
    $procs = $customers->map(function ($c) use ($group, $startAt) {
        $cmd = [PHP_BINARY, __FILE__, 'buy', (string) $c->id, json_encode($group($c)), (string) $startAt];
        $p = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);

        return [$p, $pipes];
    });
    $results = $procs->map(function ($pp) {
        [$p, $pipes] = $pp;
        $out = stream_get_contents($pipes[1]).stream_get_contents($pipes[2]);
        proc_close($p);

        return trim($out);
    });
    $ok = $results->filter(fn ($r) => $r === 'OK')->count();
    $errors = $results->filter(fn ($r) => str_starts_with($r, 'ERROR'))->values();
    printf("\n%s\n  %d buyers at the same instant -> %d succeeded, %d politely refused, %d crashed\n", $label, $customers->count(), $ok, $results->count() - $ok - $errors->count(), $errors->count());
    $results->reject(fn ($r) => $r === 'OK')->countBy()->each(fn ($n, $r) => printf("    %dx %s\n", $n, $r));

    return ['ok' => $ok, 'errors' => $errors];
}

$pass = true;
try {
    $roomy = $slot(1000);
    $last = $product(1);
    $r = race('1) One item left in stock', $customers, fn () => ['farmer_profile_id' => $farmer->id, 'pickup_slot_id' => $roomy->id, 'pickup_date' => $date, 'items' => [['product_id' => $last->id, 'quantity' => 1]]]);
    $stock = $last->fresh()->stock_quantity;
    printf("  stock afterwards: %d (must be 0)\n", $stock);
    $pass = $pass && $r['ok'] === 1 && $stock === 0 && $r['errors']->isEmpty();

    $plenty = $product(1000);
    $coupon = $fixtures['coupons'][] = Coupon::create(['farmer_profile_id' => $farmer->id, 'code' => strtoupper($tag).'ONE', 'type' => 'fixed', 'value' => 10, 'min_subtotal' => 0, 'usage_limit' => 1, 'per_customer_limit' => 1, 'is_active' => true]);
    $r = race('2) A coupon that can be used once', $customers, fn () => ['farmer_profile_id' => $farmer->id, 'pickup_slot_id' => $roomy->id, 'pickup_date' => $date, 'coupon' => $coupon->code, 'items' => [['product_id' => $plenty->id, 'quantity' => 1]]]);
    $used = $coupon->fresh()->used_count;
    printf("  coupon used_count afterwards: %d (must be 1)\n", $used);
    $pass = $pass && $r['ok'] === 1 && $used === 1 && $r['errors']->isEmpty();

    $tight = $slot(3);
    $r = race('3) A pickup window with room for 3 orders', $customers, fn () => ['farmer_profile_id' => $farmer->id, 'pickup_slot_id' => $tight->id, 'pickup_date' => $date, 'items' => [['product_id' => $plenty->id, 'quantity' => 1]]]);
    $booked = Order::where('pickup_slot_id', $tight->id)->count();
    printf("  orders in the window afterwards: %d (must be 3)\n", $booked);
    $pass = $pass && $r['ok'] === 3 && $booked === 3 && $r['errors']->isEmpty();

    $r = race('4) The same buyer double-submitting checkout 10 times', collect(array_fill(0, 10, $customers->first())), fn () => ['farmer_profile_id' => $farmer->id, 'pickup_slot_id' => $roomy->id, 'pickup_date' => $date, 'items' => [['product_id' => $plenty->id, 'quantity' => 1]]]);
    $pass = $pass && $r['ok'] >= 1 && $r['errors']->isEmpty();
} finally {
    $orders = Order::whereIn('customer_id', $customers->pluck('id'))->pluck('id');
    DB::table('coupon_redemptions')->whereIn('order_id', $orders)->delete();
    DB::table('order_status_history')->whereIn('order_id', $orders)->delete();
    DB::table('order_items')->whereIn('order_id', $orders)->delete();
    Order::whereIn('id', $orders)->delete();
    collect($fixtures['coupons'])->each->delete();
    collect($fixtures['products'])->each->delete();
    collect($fixtures['slots'])->each->delete();
    User::whereIn('id', $customers->pluck('id'))->delete();
    echo "\nTest data removed.\n";
}

echo $pass ? "\nPASS: no overselling, no double coupon use, no overbooking, no crashes.\n" : "\nFAIL\n";
exit($pass ? 0 : 1);
