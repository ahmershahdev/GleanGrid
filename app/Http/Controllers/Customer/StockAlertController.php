<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockAlert;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class StockAlertController extends Controller
{
    private const MAX_ACTIVE = 50;

    public function store(Request $request, Product $product): RedirectResponse
    {
        abort_if($product->removed_at || ! $product->farmer?->isApproved(), 404);
        $user = $request->user();

        if ($product->isOrderable()) {
            return back()->with('success', 'flash.alert_in_stock');
        }
        if ($user->stockAlerts()->whereNull('notified_at')->count() >= self::MAX_ACTIVE) {
            return back()->with('error', 'flash.alert_limit');
        }

        try {
            StockAlert::updateOrCreate(['user_id' => $user->id, 'product_id' => $product->id], ['notified_at' => null]);
        } catch (UniqueConstraintViolationException) {
        }

        return back()->with('success', 'flash.alert_on');
    }

    public function destroy(Request $request, Product $product): RedirectResponse
    {
        $request->user()->stockAlerts()->where('product_id', $product->id)->delete();

        return back()->with('success', 'flash.alert_off');
    }
}
