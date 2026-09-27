<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FarmerProfile;
use App\Models\Order;
use App\Notifications\PlatformNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FarmerController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate(['status' => 'nullable|in:pending,approved,suspended', 'q' => 'nullable|string|max:80']);

        return Inertia::render('Admin/Farmers/Index', [
            'farmers' => FarmerProfile::with('user:id,name,email,status,created_at')
                ->withCount(['products', 'orders'])
                ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
                ->when($filters['q'] ?? null, fn ($q, $s) => $q->searchWords($s, fn ($q, $t) => $q->where(fn ($w) => $w->where('stall_name', 'like', "%{$t}%"))
                    ->orWhere('email', 'like', "%{$t}%")->orWhere('contact_person', 'like', "%{$t}%")))
                ->orderByRaw("field(status, 'pending', 'approved', 'suspended')")->latest()
                ->paginate(15)->withQueryString(),
            'counts' => FarmerProfile::selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status'),
            'filters' => (object) $filters,
        ]);
    }

    public function show(FarmerProfile $farmer): Response
    {
        $farmer->load('user', 'markets:id,name', 'pickupSlots.market:id,name');

        return Inertia::render('Admin/Farmers/Show', [
            'farmer' => $farmer,
            'products' => $farmer->products()->with('category:id,name,slug')->orderBy('name')->get(),
            'stats' => [
                'orders' => $farmer->orders()->count(),
                'completed' => $farmer->orders()->where('status', 'completed')->count(),
                'revenue' => (float) $farmer->orders()->where('status', 'completed')->sum('total_amount'),
                'cancel_rate' => $farmer->orders()->count()
                    ? round($farmer->orders()->whereIn('status', ['cancelled', 'declined'])->count() / $farmer->orders()->count() * 100, 1) : 0,
            ],
            'recentOrders' => Order::where('farmer_profile_id', $farmer->id)->with('customer:id,name')->latest()->limit(8)->get(),
        ]);
    }

    public function status(Request $request, FarmerProfile $farmer): RedirectResponse
    {
        $data = $request->validate([
            'status' => 'required|in:approved,suspended,pending',
            'reason' => 'nullable|string|max:255',
        ]);

        $farmer->update([
            'status' => $data['status'],
            'status_reason' => $data['reason'] ?? null,
            'approved_at' => $data['status'] === 'approved' ? ($farmer->approved_at ?? now()) : $farmer->approved_at,
        ]);

        if (in_array($data['status'], ['approved', 'suspended'], true)) {
            $farmer->user->notify(new PlatformNotification('farmer_'.$data['status'], [], route('farmer.dashboard'), true));
        }

        AuditLog::record('farmer.'.$data['status'], ucfirst($data['status'])." stall {$farmer->stall_name}".(filled($data['reason'] ?? null) ? " — {$data['reason']}" : ''), $farmer);

        return back()->with('success', 'flash.farmer_'.$data['status']);
    }
}
