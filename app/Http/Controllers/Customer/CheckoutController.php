<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Payments\GatewayManager;
use App\Services\OrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function show(Request $request, GatewayManager $gateways): Response
    {
        return Inertia::render('Customer/Checkout', [
            'customer' => $request->user()->only('name', 'email', 'phone'),
            'paymentMethods' => $gateways->available(),
            'sandbox' => ! $gateways->live(),
        ]);
    }

    public function store(Request $request, OrderService $service, GatewayManager $gateways): RedirectResponse
    {
        $data = $request->validate([
            'payment_method' => ['nullable', Rule::in($gateways->available())],
            'groups' => 'required|array|min:1|max:20',
            'groups.*.farmer_profile_id' => 'required|integer',
            'groups.*.pickup_slot_id' => 'required|integer',
            'groups.*.pickup_date' => 'required|date_format:Y-m-d',
            'groups.*.note' => 'nullable|string|max:500',
            'groups.*.coupon' => 'nullable|string|max:30',
            'groups.*.items' => 'required|array|min:1',
            'groups.*.items.*.product_id' => 'required|integer',
            'groups.*.items.*.quantity' => 'required|integer|min:1|max:999',
        ], [
            'groups.*.pickup_slot_id.required' => 'Choose a pickup window for every stall.',
            'groups.*.pickup_date.required' => 'Choose a pickup date for every stall.',
            'payment_method.in' => 'payment.method_unavailable',
        ]);

        $orders = $service->place($request->user(), $data['groups'], $data['payment_method'] ?? 'cash');

        if ($payment = $orders->first()?->payment) {
            return redirect()->route('customer.payments.show', $payment)->with('placed', $orders->pluck('code'));
        }

        return redirect()->route('customer.orders.index')
            ->with('success', 'flash.orders_placed')
            ->with('placed', $orders->pluck('code'));
    }
}
