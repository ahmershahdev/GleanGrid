<?php

use App\Models\Order;
use App\Models\Product;
use App\Notifications\PlatformNotification;
use App\Support\Settings;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('gleangrid:restock-weekly', function () {
    $count = Product::whereNull('removed_at')->where('weekly_quantity', '>', 0)
        ->where('status', '!=', 'unavailable')
        ->whereHas('farmer', fn ($q) => $q->where('status', 'approved'))
        ->update(['stock_quantity' => DB::raw('weekly_quantity'), 'status' => 'available', 'updated_at' => now()]);

    $this->info("Restocked {$count} products from their weekly templates.");
})->purpose('Reset product stock to each farmer\'s weekly template');

Schedule::command('gleangrid:restock-weekly')->weeklyOn(1, '05:00');

Artisan::command('gleangrid:send-pickup-reminders {--force : Send now, whatever the hour}', function () {
    if (! $this->option('force') && now()->hour !== Settings::get('reminder_hour')) {
        $this->line('Not reminder time yet ('.Settings::get('reminder_hour').':00).');

        return;
    }

    $sent = 0;
    Order::whereIn('status', ['placed', 'accepted', 'ready'])
        ->whereDate('pickup_date', now()->addDay()->toDateString())
        ->whereNull('reminder_sent_at')
        ->with('customer', 'farmer:id,stall_name', 'market:id,name')
        ->chunkById(100, function ($orders) use (&$sent) {
            foreach ($orders as $order) {
                if (! Order::whereKey($order->id)->whereNull('reminder_sent_at')->update(['reminder_sent_at' => now()])) {
                    continue;
                }
                $order->customer->notify(new PlatformNotification('pickup_reminder', [
                    'code' => $order->code,
                    'date' => $order->pickup_date->toDateString(),
                    'time' => substr((string) $order->pickup_starts_at, 0, 5).'–'.substr((string) $order->pickup_ends_at, 0, 5),
                    'farmer' => $order->farmer->stall_name,
                    'market' => $order->market->name,
                ], route('customer.orders.show', $order), true));
                $sent++;
            }
        });

    $this->info("Sent {$sent} pickup reminders.");
})->purpose('E-mail tomorrow\'s pickup reminders');

Schedule::command('gleangrid:send-pickup-reminders')->hourly()->withoutOverlapping();
