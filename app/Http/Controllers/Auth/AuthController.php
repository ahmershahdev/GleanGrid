<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AccountSecurity;
use App\Support\BotGuard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    /** Failed attempts allowed per account + IP before a cool-down. */
    private const MAX_ATTEMPTS = 5;

    public function __construct(private AccountSecurity $security) {}

    public function showLogin(): Response
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'login' => 'required|string|max:100',
            'password' => 'required|string|max:200',
            'remember' => 'boolean',
        ]);

        BotGuard::check($request, 'login');

        // Throttle per account *and* IP: slows credential stuffing without letting
        // one attacker lock a real user out from everywhere.
        $key = 'login:'.Str::lower($data['login']).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            throw ValidationException::withMessages([
                'login' => trans('auth.throttle', ['seconds' => RateLimiter::availableIn($key)]),
            ]);
        }

        $field = filter_var($data['login'], FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        if (! Auth::attempt([$field => $data['login'], 'password' => $data['password']], $data['remember'] ?? false)) {
            // Exponential-ish back-off: each strike extends the window.
            RateLimiter::hit($key, 60 * max(1, RateLimiter::attempts($key)));
            $this->security->recordLogin($request, $data['login'], User::where($field, $data['login'])->first(), false);

            throw ValidationException::withMessages(['login' => __('auth.failed')]);
        }

        $user = Auth::user();

        // Deactivated customers are locked out; suspended farmers may still sign in to see their status.
        if (! $user->isActive()) {
            Auth::logout();
            throw ValidationException::withMessages(['login' => 'This account has been deactivated. Please contact support.']);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate(); // new id after privilege change: no session fixation
        $request->session()->put('locale', $user->locale);
        $user->forceFill(['last_login_at' => now()])->save();
        $this->security->recordLogin($request, $data['login'], $user, true);

        return redirect()->intended(route($user->dashboardRoute()));
    }

    public function showRegister(Request $request): Response
    {
        return Inertia::render('Auth/Register', [
            'role' => $request->query('as') === 'farmer' ? 'farmer' : 'customer',
        ]);
    }

    public function register(Request $request): RedirectResponse
    {
        $isFarmer = $request->input('role') === 'farmer';

        $data = $request->validate([
            'role' => ['required', Rule::in([User::ROLE_CUSTOMER, User::ROLE_FARMER])],
            'name' => 'required|string|max:100',
            'username' => 'required|alpha_dash|min:3|max:50|unique:users',
            'email' => 'required|email:rfc,strict|max:100|unique:users',
            'phone' => ['required', 'string', 'max:30', 'regex:/^[0-9+\-\s()]{7,30}$/'],
            'address' => 'required|string|max:500',
            'city' => 'nullable|string|max:80',
            'password' => ['required', 'confirmed', Password::defaults()],
            'stall_name' => [Rule::requiredIf($isFarmer), 'nullable', 'string', 'max:120'],
            'contact_person' => [Rule::requiredIf($isFarmer), 'nullable', 'string', 'max:100'],
            'terms' => 'accepted',
        ]);

        BotGuard::check($request, 'register');

        $user = DB::transaction(function () use ($data, $isFarmer) {
            $user = User::create([
                ...collect($data)->only('name', 'username', 'email', 'phone', 'address', 'city', 'role', 'password')->all(),
                'locale' => session('locale', app()->getLocale()),
            ]);

            if ($isFarmer) {
                $user->farmerProfile()->create([
                    'stall_name' => $data['stall_name'],
                    'slug' => Str::slug($data['stall_name']).'-'.Str::lower(Str::random(4)),
                    'contact_person' => $data['contact_person'],
                    'phone' => $data['phone'],
                    'email' => $data['email'],
                    'address' => $data['address'],
                    'operating_days' => [],
                    'status' => 'pending',
                ]);
            }

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();
        $this->security->recordLogin($request, $user->email, $user, true);
        $this->security->sendEmailCode($user);

        return redirect()->route('verification.notice')
            ->with('success', $isFarmer ? 'flash.farmer_registered' : 'flash.welcome');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
