<?php

namespace App\Http\Controllers;

use App\Services\AccountSecurity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request, AccountSecurity $security): Response
    {
        return Inertia::render('Account/Profile', [
            'profile' => $request->user()->only('name', 'username', 'email', 'phone', 'address', 'city', 'locale'),
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
            'avatar' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        } else {
            unset($data['avatar']);
        }

        $emailChanged = strcasecmp($user->email, $data['email']) !== 0;
        $user->fill($data);
        if ($emailChanged) {
            // A new address has to be proven again before it can receive order mail.
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
        $data = $request->validate([
            'current_password' => 'required|current_password',
            'password' => ['required', 'confirmed', 'different:current_password', Password::defaults()],
        ]);

        $request->user()->update(['password' => Hash::make($data['password'])]);
        $security->passwordChanged($request, $request->user());

        return back()->with('success', 'flash.password_saved');
    }

    /** "Sign out everywhere else" — needs the password so a stolen session can't use it. */
    public function destroyOtherSessions(Request $request, AccountSecurity $security): RedirectResponse
    {
        $request->validate(['password' => 'required|current_password']);
        $security->logoutOtherSessions($request);
        $request->user()->forceFill(['remember_token' => Str::random(60)])->save();

        return back()->with('success', 'flash.sessions_cleared');
    }
}
