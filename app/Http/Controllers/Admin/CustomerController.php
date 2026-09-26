<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate(['status' => 'nullable|in:active,inactive', 'q' => 'nullable|string|max:80']);

        return Inertia::render('Admin/Customers', [
            'customers' => User::where('role', User::ROLE_CUSTOMER)
                ->withCount('orders', 'reviews')
                ->withSum(['orders as spent' => fn ($q) => $q->where('status', 'completed')], 'total_amount')
                ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
                ->when($filters['q'] ?? null, fn ($q, $t) => $q->where(fn ($w) => $w->where('name', 'like', "%{$t}%")
                    ->orWhere('email', 'like', "%{$t}%")->orWhere('username', 'like', "%{$t}%")))
                ->latest()->paginate(20)->withQueryString(),
            'filters' => $filters,
        ]);
    }

    public function status(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isCustomer(), 404);
        $data = $request->validate(['status' => 'required|in:active,inactive']);
        $user->update($data);

        // Kick a deactivated customer out of any live sessions.
        if ($data['status'] === 'inactive') {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        return back()->with('success', 'flash.customer_'.$data['status']);
    }
}
