<?php

use App\Models\Product;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
 * Weekly stock template: every product with a weekly quantity is restocked to
 * that amount. Runs automatically on Monday mornings (see schedule below);
 * farmers can also trigger it from their Products page.
 */
Artisan::command('gleangrid:restock-weekly', function () {
    $count = 0;
    Product::whereNull('removed_at')->where('weekly_quantity', '>', 0)
        ->where('status', '!=', 'unavailable')
        ->whereHas('farmer', fn ($q) => $q->where('status', 'approved'))
        ->each(function (Product $product) use (&$count) {
            $product->stock_quantity = $product->weekly_quantity;
            $product->status = 'available';
            $product->save();
            $count++;
        });

    $this->info("Restocked {$count} products from their weekly templates.");
})->purpose('Reset product stock to each farmer\'s weekly template');

Schedule::command('gleangrid:restock-weekly')->weeklyOn(1, '05:00');
