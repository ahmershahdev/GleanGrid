<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Order;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CouponService
{
    public function preview(string $code, int $farmerProfileId, float $subtotal, ?User $user): array
    {
        $coupon = Coupon::where('code', strtoupper(trim($code)))->first();
        $this->assertUsable($coupon, $farmerProfileId, $subtotal, $user);

        return ['coupon' => $coupon, 'discount' => $coupon->discountFor($subtotal)];
    }

    public function redeem(string $code, Order $order, User $user, float $subtotal): float
    {
        $coupon = Coupon::where('code', strtoupper(trim($code)))->lockForUpdate()->first();
        $this->assertUsable($coupon, $order->farmer_profile_id, $subtotal, $user, $order->id);

        $discount = $coupon->discountFor($subtotal);
        CouponRedemption::create(['coupon_id' => $coupon->id, 'order_id' => $order->id, 'user_id' => $user->id, 'discount_amount' => $discount]);
        $coupon->increment('used_count');

        return $discount;
    }

    public function release(Order $order): void
    {
        $redemption = CouponRedemption::where('order_id', $order->id)->first();
        if (! $redemption) {
            return;
        }
        Coupon::whereKey($redemption->coupon_id)->lockForUpdate()->first()?->decrement('used_count');
        $redemption->delete();
    }

    private function assertUsable(?Coupon $coupon, int $farmerProfileId, float $subtotal, ?User $user, ?int $ignoreOrderId = null): void
    {
        $fail = fn (string $key) => throw ValidationException::withMessages(['coupon' => $key]);

        if (! $coupon || $coupon->farmer_profile_id !== $farmerProfileId) {
            $fail('coupon.invalid');
        }
        if (! $coupon->is_active || ($coupon->starts_at && $coupon->starts_at->isFuture()) || ($coupon->ends_at && $coupon->ends_at->isPast())) {
            $fail('coupon.expired');
        }
        if ($subtotal < $coupon->min_subtotal) {
            $fail('coupon.minimum');
        }
        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            $fail('coupon.used_up');
        }
        if ($user) {
            $mine = CouponRedemption::where('coupon_id', $coupon->id)->where('user_id', $user->id)
                ->when($ignoreOrderId, fn ($q) => $q->where('order_id', '!=', $ignoreOrderId))->count();
            if ($mine >= $coupon->per_customer_limit) {
                $fail('coupon.already_used');
            }
        }
    }
}
