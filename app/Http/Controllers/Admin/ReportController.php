<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Report;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $range = $this->range($request);

        return Inertia::render('Admin/Reports', [
            'range' => $range,
            'summary' => $this->summary($range),
            'byMarket' => $this->revenueByMarket($range),
            'activeFarmers' => $this->activeFarmers($range),
            'byCategory' => $this->byCategory($range),
            'history' => Report::with('author:id,name')->latest('generated_at')->limit(10)->get(),
        ]);
    }

    public function export(Request $request, string $type): StreamedResponse
    {
        abort_unless(in_array($type, ['orders', 'markets', 'farmers'], true), 404);
        $range = $this->range($request);

        [$header, $rows] = match ($type) {
            'orders' => [
                ['Code', 'Placed', 'Customer', 'Farmer', 'Market', 'Pickup date', 'Status', 'Items', 'Total'],
                $this->ordersQuery($range)->with('customer:id,name', 'farmer:id,stall_name', 'market:id,name')->get()
                    ->map(fn (Order $o) => [$o->code, $o->created_at->toDateTimeString(), $o->customer->name, $o->farmer->stall_name, $o->market->name, $o->pickup_date->toDateString(), $o->status, $o->items_count, $o->total_amount]),
            ],
            'markets' => [
                ['Market', 'Orders', 'Completed', 'Revenue'],
                $this->revenueByMarket($range)->map(fn ($m) => [$m['name'], $m['orders'], $m['completed'], $m['revenue']]),
            ],
            'farmers' => [
                ['Stall', 'Orders', 'Completed', 'Revenue', 'Rating'],
                $this->activeFarmers($range, 1000)->map(fn ($f) => [$f['stall_name'], $f['orders'], $f['completed'], $f['revenue'], $f['rating_avg']]),
            ],
        };

        Report::create([
            'generated_by' => $request->user()->id,
            'report_type' => $type,
            'filters' => $range,
            'summary' => ['rows' => count($rows)],
            'generated_at' => now(),
        ]);

        $filename = "gleangrid-{$type}-{$range['from']}-to-{$range['to']}.csv";

        return response()->streamDownload(function () use ($header, $rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $header);
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function range(Request $request): array
    {
        $data = $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date|after_or_equal:from']);

        return [
            'from' => $data['from'] ?? now()->subDays(29)->toDateString(),
            'to' => $data['to'] ?? now()->toDateString(),
        ];
    }

    private function ordersQuery(array $range)
    {
        return Order::whereBetween('created_at', [$range['from'].' 00:00:00', $range['to'].' 23:59:59']);
    }

    private function summary(array $range): array
    {
        $orders = $this->ordersQuery($range);

        return [
            'orders' => (clone $orders)->count(),
            'completed' => (clone $orders)->where('status', 'completed')->count(),
            'cancelled' => (clone $orders)->whereIn('status', ['cancelled', 'declined'])->count(),
            'revenue' => (float) (clone $orders)->where('status', 'completed')->sum('total_amount'),
            'average' => round((float) (clone $orders)->where('status', 'completed')->avg('total_amount'), 2),
            'customers' => (clone $orders)->distinct('customer_id')->count('customer_id'),
            'byStatus' => (clone $orders)->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status'),
        ];
    }

    private function revenueByMarket(array $range)
    {
        return Market::withCount([
            'orders as orders' => fn ($q) => $q->whereBetween('created_at', [$range['from'].' 00:00:00', $range['to'].' 23:59:59']),
            'orders as completed' => fn ($q) => $q->whereBetween('created_at', [$range['from'].' 00:00:00', $range['to'].' 23:59:59'])->where('status', 'completed'),
        ])->withSum(['orders as revenue' => fn ($q) => $q->whereBetween('created_at', [$range['from'].' 00:00:00', $range['to'].' 23:59:59'])->where('status', 'completed')], 'total_amount')
            ->orderByDesc('revenue')->get()
            ->map(fn ($m) => ['id' => $m->id, 'name' => $m->name, 'orders' => $m->orders, 'completed' => $m->completed, 'revenue' => round((float) $m->revenue, 2)]);
    }

    private function activeFarmers(array $range, int $limit = 10)
    {
        $between = [$range['from'].' 00:00:00', $range['to'].' 23:59:59'];

        return FarmerProfile::withCount([
            'orders as orders' => fn ($q) => $q->whereBetween('created_at', $between),
            'orders as completed' => fn ($q) => $q->whereBetween('created_at', $between)->where('status', 'completed'),
        ])->withSum(['orders as revenue' => fn ($q) => $q->whereBetween('created_at', $between)->where('status', 'completed')], 'total_amount')
            ->orderByDesc('orders')->limit($limit)->get()
            ->map(fn ($f) => ['id' => $f->id, 'stall_name' => $f->stall_name, 'slug' => $f->slug, 'orders' => $f->orders, 'completed' => $f->completed, 'revenue' => round((float) $f->revenue, 2), 'rating_avg' => $f->rating_avg]);
    }

    private function byCategory(array $range)
    {
        return OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$range['from'].' 00:00:00', $range['to'].' 23:59:59'])
            ->selectRaw('categories.name, categories.color, sum(order_items.line_total) as revenue, sum(order_items.quantity) as qty')
            ->groupBy('categories.name', 'categories.color')->orderByDesc('revenue')->get();
    }
}
