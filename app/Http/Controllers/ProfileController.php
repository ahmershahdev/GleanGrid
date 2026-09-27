<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Order;
use App\Services\AccountSecurity;
use App\Services\OrderService;
use App\Services\SocialAuthService;
use App\Support\ImageUpload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileController extends Controller
{
    public function edit(Request $request, AccountSecurity $security, SocialAuthService $social): Response
    {
        return Inertia::render('Account/Profile', [
            'profile' => $request->user()->only('name', 'username', 'email', 'phone', 'address', 'city', 'locale'),
            'connections' => [
                'linked' => $request->user()->socialAccounts()->get(['provider', 'email', 'last_used_at', 'created_at']),
                'available' => $social->status(),
                'has_password' => $request->user()->hasPassword(),
            ],
            'security' => [
                'verified' => $request->user()->hasVerifiedEmail(),
                'password_changed_at' => $request->user()->password_changed_at,
                'sessions' => $security->sessions($request),
                'recent_logins' => $request->user()->loginEvents()->latest('id')->limit(6)
                    ->get(['id', 'ip_address', 'user_agent', 'successful', 'created_at'])
                    ->map(fn ($e) => [...$e->only('id', 'ip_address', 'successful', 'created_at'), 'device' => $security->describeAgent($e->user_agent)]),
            ],
        ]);
    }

    public function update(Request $request, AccountSecurity $security): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'username' => ['required', 'alpha_dash', 'max:50', Rule::unique('users')->ignore($user->id)],
            'email' => ['required', 'email', 'max:100', Rule::unique('users')->ignore($user->id)],
            'phone' => 'required|string|max:30',
            'address' => 'required|string|max:500',
            'city' => 'nullable|string|max:80',
            'locale' => ['required', Rule::in(array_keys(config('gleangrid.locales')))],
            'avatar' => ['nullable', ...ImageUpload::RULES],
            'remove_avatar' => 'boolean',
        ]);

        if ($request->hasFile('avatar')) {
            ImageUpload::delete($user->avatar);
            $data['avatar'] = ImageUpload::store($request->file('avatar'), 'avatars', 'avatar', maxSide: 512);
        } elseif ($request->boolean('remove_avatar')) {
            ImageUpload::delete($user->avatar);
            $data['avatar'] = null;
        } else {
            unset($data['avatar']);
        }
        unset($data['remove_avatar']);

        $emailChanged = strcasecmp($user->email, $data['email']) !== 0;
        $user->fill($data);
        if ($emailChanged) {
            $user->email_verified_at = null;
        }
        $user->save();
        $request->session()->put('locale', $data['locale']);

        if ($emailChanged) {
            $security->sendEmailCode($user);

            return redirect()->route('verification.notice')->with('success', 'flash.code_resent');
        }

        return back()->with('success', 'flash.profile_saved');
    }

    public function password(Request $request, AccountSecurity $security): RedirectResponse
    {
        $data = $request->validate($request->user()->hasPassword() ? [
            'current_password' => 'required|current_password',
            'password' => ['required', 'confirmed', 'different:current_password', Password::defaults()],
        ] : [
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $request->user()->update(['password' => Hash::make($data['password'])]);
        $security->passwordChanged($request, $request->user());

        return back()->with('success', 'flash.password_saved');
    }

    public function destroyOtherSessions(Request $request, AccountSecurity $security): RedirectResponse
    {
        $request->validate($request->user()->hasPassword() ? ['password' => 'required|current_password'] : ['confirm' => 'required|in:SIGN OUT']);
        $security->logoutOtherSessions($request);
        $request->user()->forceFill(['remember_token' => Str::random(60)])->save();

        return back()->with('success', 'flash.sessions_cleared');
    }

    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        $data = [
            'exported_at' => now()->toIso8601String(),
            'service' => 'GleanGrid — https://gleangrid.ahmershah.dev',
            'account' => $user->only('name', 'username', 'email', 'phone', 'address', 'city', 'role', 'status', 'locale', 'created_at', 'email_verified_at', 'last_login_at'),
            'farmer_stall' => $user->farmerProfile?->only('stall_name', 'slug', 'contact_person', 'phone', 'email', 'address', 'tagline', 'bio', 'latitude', 'longitude', 'operating_days', 'order_cutoff_hours', 'status', 'created_at'),
            'orders' => $user->orders()->with('items:id,order_id,product_name,unit,unit_price,quantity,line_total', 'farmer:id,stall_name', 'market:id,name')->latest()->get()
                ->map(fn ($o) => [...$o->only('code', 'status', 'pickup_date', 'pickup_starts_at', 'pickup_ends_at', 'subtotal', 'discount_amount', 'coupon_code', 'total_amount', 'customer_note', 'created_at'), 'farmer' => $o->farmer?->stall_name, 'market' => $o->market?->name, 'items' => $o->items]),
            'reviews' => $user->reviews()->get(['reviewable_type', 'reviewable_id', 'rating', 'comment', 'farmer_reply', 'created_at']),
            'favorites' => $user->favorites()->get(['favoritable_type', 'favoritable_id', 'notify_restock', 'created_at']),
            'stock_alerts' => $user->stockAlerts()->with('product:id,name')->get()->map(fn ($a) => ['product' => $a->product?->name, 'notified_at' => $a->notified_at, 'created_at' => $a->created_at]),
            'payments' => $user->payments()->get(['reference', 'method', 'status', 'amount', 'refunded_amount', 'card_brand', 'card_last4', 'wallet_msisdn', 'paid_at', 'created_at']),
            'connected_accounts' => $user->socialAccounts()->get(['provider', 'email', 'created_at', 'last_used_at']),
            'family_links' => [
                'members' => $user->familyMembers()->with('member:id,name')->get()->map(fn ($l) => ['name' => $l->member?->name, 'status' => $l->status]),
                'households' => $user->familyMemberships()->with('owner:id,name')->get()->map(fn ($l) => ['name' => $l->owner?->name, 'status' => $l->status]),
            ],
            'sign_ins_last_90_days' => $user->loginEvents()->where('created_at', '>=', now()->subDays(90))->latest('id')->get(['ip_address', 'user_agent', 'successful', 'created_at']),
            'notifications' => $user->notifications()->latest()->limit(200)->get(['data', 'read_at', 'created_at']),
        ];

        AuditLog::record('account.exported', "{$user->email} downloaded their data", $user);

        return response()->streamDownload(
            fn () => print (json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)),
            'gleangrid-data-'.$user->username.'-'.now()->format('Y-m-d').'.json',
            ['Content-Type' => 'application/json; charset=UTF-8'],
        );
    }

    public function destroy(Request $request, OrderService $orders): RedirectResponse
    {
        $user = $request->user();
        $request->validate($user->hasPassword()
            ? ['password' => 'required|current_password', 'confirm' => 'required|in:DELETE']
            : ['confirm' => 'required|in:DELETE']);

        if ($user->isAdmin()) {
            return back()->with('error', 'flash.admin_cannot_delete');
        }
        if ($user->isDemo()) {
            return back()->with('error', 'flash.demo_cannot_delete');
        }

        foreach ($user->orders()->whereIn('status', Order::OPEN)->get() as $order) {
            $orders->forceClose($order, 'cancelled', 'Customer closed their account.');
        }
        if ($stall = $user->farmerProfile) {
            foreach ($stall->orders()->whereIn('status', Order::OPEN)->get() as $order) {
                $orders->forceClose($order, 'declined', 'This stall has closed on GleanGrid.');
            }
            $stall->update(['status' => 'suspended', 'status_reason' => 'Closed by the owner.']);
        }

        AuditLog::record('account.deleted', "Account #{$user->id} deleted by its owner", $user, ['role' => $user->role]);

        DB::transaction(function () use ($user) {
            if ($user->avatar) {
                ImageUpload::delete($user->avatar);
            }
            $user->favorites()->delete();
            $user->familyMembers()->delete();
            $user->familyMemberships()->delete();
            $user->notifications()->delete();
            $user->loginEvents()->delete();
            $user->socialAccounts()->delete();
            $user->stockAlerts()->delete();
            DB::table('verification_codes')->where('user_id', $user->id)->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->forceFill([
                'name' => 'Deleted user',
                'username' => 'deleted-'.$user->id,
                'email' => 'deleted-'.$user->id.'@deleted.invalid',
                'phone' => '0000000',
                'address' => 'Removed at the owner\'s request',
                'city' => null,
                'avatar' => null,
                'status' => 'inactive',
                'email_verified_at' => null,
                'remember_token' => null,
                'password' => Str::random(64),
                'anonymized_at' => now(),
            ])->save();
        });

        auth()->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home')->with('success', 'flash.account_deleted');
    }
}
