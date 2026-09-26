<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AccountSecurity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationController extends Controller
{
    public function notice(Request $request): Response|RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->route($request->user()->dashboardRoute());
        }

        return Inertia::render('Auth/VerifyEmail', [
            'email' => $request->user()->email,
        ]);
    }

    public function verify(Request $request, AccountSecurity $security): RedirectResponse
    {
        $data = $request->validate(['code' => 'required|digits:6']);
        $security->verifyEmailCode($request->user(), $data['code']);

        return redirect()->intended(route($request->user()->dashboardRoute()))->with('success', 'flash.email_verified');
    }

    public function resend(Request $request, AccountSecurity $security): RedirectResponse
    {
        if (! $request->user()->hasVerifiedEmail()) {
            $security->sendEmailCode($request->user());
        }

        return back()->with('success', 'flash.code_resent');
    }
}
