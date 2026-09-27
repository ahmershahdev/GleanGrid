<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Payment;
use App\Services\OrderService;
use App\Services\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    private const STATUSES = ['pending', 'processing', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded'];

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'method' => ['nullable', Rule::in(Payment::METHODS)],
            'q' => 'nullable|string|max:60',
        ]);

        $captured = Payment::whereIn('status', ['paid', 'partially_refunded', 'refunded']);

        return Inertia::render('Admin/Payments', [
            'payments' => Payment::with('user:id,name,email')->withCount('orders')
                ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
                ->when($filters['method'] ?? null, fn ($q, $m) => $q->where('method', $m))
                ->when($filters['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('reference', 'like', '%'.$s.'%')
                    ->orWhereHas('user', fn ($u) => $u->where('email', 'like', '%'.$s.'%')->orWhere('name', 'like', '%'.$s.'%'))))
                ->latest('id')->paginate(20)->withQueryString()
                ->through(fn (Payment $p) => [...$p->summary(), 'orders_count' => $p->orders_count, 'customer' => $p->user?->only('id', 'name', 'email')]),
            'stats' => [
                'captured' => (float) (clone $captured)->sum('amount'),
                'refunded' => (float) Payment::sum('refunded_amount'),
                'open' => Payment::whereIn('status', Payment::OPEN)->count(),
                'success_rate' => ($total = Payment::whereNotIn('status', Payment::OPEN)->count()) ? round((clone $captured)->count() / $total * 100) : null,
                'by_method' => Payment::selectRaw('method, COUNT(*) as count, SUM(CASE WHEN status IN (\'paid\',\'partially_refunded\',\'refunded\') THEN amount ELSE 0 END) as amount')
                    ->groupBy('method')->get(),
            ],
            'filters' => (object) $filters,
        ]);
    }

    public function show(Payment $payment): Response
    {
        return Inertia::render('Admin/PaymentShow', [
            'payment' => [...$payment->summary(), 'provider_ref' => $payment->provider_ref, 'customer' => $payment->user?->only('id', 'name', 'email', 'phone')],
            'orders' => $payment->orders()->with('farmer:id,stall_name')->orderBy('id')->get()
                ->map(fn (Order $o) => [...$o->only('id', 'code', 'status', 'payment_status', 'total_amount'), 'farmer' => $o->farmer?->stall_name]),
            'events' => $payment->events()->orderBy('id')->get(['id', 'type', 'status', 'message', 'ip_address', 'created_at']),
        ]);
    }

    public function refund(Request $request, Payment $payment, OrderService $orders, PaymentService $payments): RedirectResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:5|max:200']);
        $reason = 'Refunded by GleanGrid: '.$data['reason'];

        if (in_array($payment->status, Payment::OPEN, true)) {
            $payments->abandon($payment, $reason, 'failed');
        }

        $refunded = 0;
        foreach ($payment->orders()->where('payment_status', 'paid')->orderBy('id')->get() as $order) {
            in_array($order->status, Order::OPEN, true)
                ? $orders->forceClose($order, 'cancelled', $reason)
                : $orders->refund($order, $reason);
            $refunded++;
        }

        AuditLog::record('payment.refunded', "Refunded payment {$payment->reference} ({$refunded} order(s)): {$data['reason']}", $payment);

        return back()->with('success', 'flash.payment_refunded');
    }
}
