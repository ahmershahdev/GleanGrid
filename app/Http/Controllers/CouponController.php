<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\FarmerProfile;
use App\Models\Product;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Coupons: a customer-side preview for checkout, plus management shared by
 * farmers (their own stall only) and admins (any stall).
 */
class CouponController extends Controller
{
    /** Checkout preview. The subtotal is recomputed from live prices, never trusted from the browser. */
    public function preview(Request $request, CouponService $coupons): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:30',
            'farmer_profile_id' => 'required|integer',
            'items' => 'required|array|min:1|max:100',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:999',
        ]);

        $qty = collect($data['items'])->groupBy('product_id')->map->sum('quantity');
        $subtotal = Product::whereIn('id', $qty->keys())->where('farmer_profile_id', $data['farmer_profile_id'])->get(['id', 'price'])
            ->sum(fn ($p) => $p->price * $qty[$p->id]);

        ['coupon' => $coupon, 'discount' => $discount] = $coupons->preview($data['code'], (int) $data['farmer_profile_id'], (float) $subtotal, $request->user());

        return response()->json([
            'code' => $coupon->code,
            'description' => $coupon->description,
            'discount' => $discount,
            'subtotal' => round($subtotal, 2),
            'total' => round($subtotal - $discount, 2),
        ]);
    }

    public function index(Request $request): Response
    {
        $admin = $request->user()->isAdmin();

        return Inertia::render('Coupons/Manage', [
            'coupons' => Coupon::query()
                ->when(! $admin, fn ($q) => $q->where('farmer_profile_id', $request->user()->farmerProfile->id))
                ->with('farmer:id,stall_name,slug')->withSum('redemptions as discounted', 'discount_amount')
                ->latest()->get(),
            'farmers' => $admin ? FarmerProfile::approved()->orderBy('stall_name')->get(['id', 'stall_name']) : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['farmer_profile_id'] = $request->user()->isAdmin() ? $data['farmer_profile_id'] : $request->user()->farmerProfile->id;
        Coupon::create($data);

        return back()->with('success', 'flash.coupon_saved');
    }

    public function update(Request $request, Coupon $coupon): RedirectResponse
    {
        $this->authorizeCoupon($request, $coupon);
        // Quick toggle from the list, or a full edit.
        if ($request->has('toggle')) {
            $coupon->update(['is_active' => ! $coupon->is_active]);
        } else {
            $data = $this->validated($request, $coupon);
            unset($data['farmer_profile_id']);
            $coupon->update($data);
        }

        return back()->with('success', 'flash.coupon_saved');
    }

    public function destroy(Request $request, Coupon $coupon): RedirectResponse
    {
        $this->authorizeCoupon($request, $coupon);
        // Keep history intact: a coupon that was ever used is only switched off.
        $coupon->redemptions()->exists() ? $coupon->update(['is_active' => false]) : $coupon->delete();

        return back()->with('success', 'flash.coupon_deleted');
    }

    private function validated(Request $request, ?Coupon $coupon = null): array
    {
        $request->merge(['code' => strtoupper(trim((string) $request->input('code')))]);

        return $request->validate([
            'farmer_profile_id' => [Rule::requiredIf($request->user()->isAdmin() && ! $coupon), 'nullable', 'integer', 'exists:farmer_profiles,id'],
            'code' => ['required', 'string', 'min:4', 'max:30', 'regex:/^[A-Z0-9_-]+$/', Rule::unique('coupons', 'code')->ignore($coupon?->id)],
            'description' => 'nullable|string|max:160',
            'type' => ['required', Rule::in(Coupon::TYPES)],
            'value' => ['required', 'numeric', 'gt:0', Rule::when($request->input('type') === 'percent', 'max:100')],
            'min_subtotal' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|gt:0',
            'usage_limit' => 'nullable|integer|min:1',
            'per_customer_limit' => 'required|integer|min:1|max:100',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'is_active' => 'boolean',
        ]) + ['min_subtotal' => 0];
    }

    private function authorizeCoupon(Request $request, Coupon $coupon): void
    {
        abort_unless($request->user()->isAdmin() || $coupon->farmer_profile_id === $request->user()->farmerProfile?->id, 403);
    }
}
