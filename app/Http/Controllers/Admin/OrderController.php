<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Market;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => 'nullable|in:'.implode(',', Order::STATUSES),
            'market' => 'nullable|integer',
            'q' => 'nullable|string|max:50',
        ]);

        return Inertia::render('Admin/Orders', [
            'orders' => Order::with('customer:id,name', 'farmer:id,stall_name,slug', 'market:id,name')
                ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
                ->when($filters['market'] ?? null, fn ($q, $m) => $q->where('market_id', $m))
                ->when($filters['q'] ?? null, fn ($q, $s) => $q->searchWords($s, fn ($q, $t) => $q->where('code', 'like', "%{$t}%")))
                ->latest()->paginate(20)->withQueryString(),
            'markets' => Market::orderBy('name')->get(['id', 'name']),
            'filters' => (object) $filters,
        ]);
    }

    public function show(Order $order): Response
    {
        return Inertia::render('Admin/OrderShow', [
            'order' => $order->load('customer:id,name,email,phone,no_show_count', 'farmer:id,stall_name,slug,phone', 'market:id,name,address', 'items'),
            'history' => $order->statusHistory(),
            'audit' => AuditLog::with('user:id,name')->where('subject_type', 'order')->where('subject_id', $order->id)->latest('id')->get(),
        ]);
    }

    public function cancel(Request $request, Order $order, OrderService $service): RedirectResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:5|max:300']);
        if (! $service->forceClose($order, 'cancelled', 'Cancelled by GleanGrid: '.$data['reason'])) {
            return back()->with('error', 'flash.order_locked');
        }
        AuditLog::record('order.cancelled', "Cancelled order {$order->code}: {$data['reason']}", $order);

        return back()->with('success', 'flash.order_cancelled');
    }
}
