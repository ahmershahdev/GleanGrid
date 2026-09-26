<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Services\OrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('Customer/Checkout', [
            'customer' => $request->user()->only('name', 'email', 'phone'),
        ]);
    }

    public function store(Request $request, OrderService $service): RedirectResponse
    {
        $data = $request->validate([
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
        ]);

        $orders = $service->place($request->user(), $data['groups']);

        return redirect()->route('customer.orders.index')
            ->with('success', 'flash.orders_placed')
            ->with('placed', $orders->pluck('code'));
    }
}
