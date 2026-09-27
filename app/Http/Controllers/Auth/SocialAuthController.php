<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\AccountSecurity;
use App\Services\SocialAuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use RuntimeException;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;
use Throwable;

class SocialAuthController extends Controller
{
    private const SCOPES = [
        'google' => ['openid', 'profile', 'email'],
        'facebook' => ['email', 'public_profile'],
    ];

    public function __construct(private SocialAuthService $social, private AccountSecurity $security) {}

    public function redirect(Request $request, string $provider): SymfonyRedirect|RedirectResponse
    {
        $this->guardProvider($provider);
        if (! $this->social->configured($provider)) {
            return redirect()->route('login')->with('error', 'flash.oauth_unconfigured');
        }

        $request->session()->put('oauth.intent', [
            'as' => $request->query('as') === User::ROLE_FARMER ? User::ROLE_FARMER : User::ROLE_CUSTOMER,
            'link' => null,
        ]);

        return $this->driver($provider)->redirect();
    }

    public function link(Request $request, string $provider): SymfonyRedirect|RedirectResponse
    {
        $this->guardProvider($provider);
        if (! $this->social->configured($provider)) {
            return back()->with('error', 'flash.oauth_unconfigured');
        }

        $request->session()->put('oauth.intent', ['as' => $request->user()->role, 'link' => $request->user()->id]);

        return $this->driver($provider)->redirect();
    }

    public function callback(Request $request, string $provider): RedirectResponse
    {
        $this->guardProvider($provider);
        $intent = $request->session()->pull('oauth.intent', ['as' => User::ROLE_CUSTOMER, 'link' => null]);
        $linkUser = $intent['link'] && $request->user()?->id === $intent['link'] ? $request->user() : null;
        $back = $linkUser ? route('profile.edit') : route('login');

        if ($request->filled('error') || ! $this->social->configured($provider)) {
            return redirect($back)->with('error', 'flash.oauth_cancelled');
        }

        try {
            $socialUser = $this->driver($provider)->user();
            $result = $this->social->resolve($provider, $socialUser, $intent['as'] ?? User::ROLE_CUSTOMER, $linkUser);
        } catch (InvalidStateException) {
            return redirect($back)->with('error', 'flash.oauth_state');
        } catch (RuntimeException $e) {
            $key = in_array($e->getMessage(), ['oauth_taken', 'oauth_already_linked', 'oauth_no_email', 'oauth_unverified', 'account_inactive', 'registration_closed', 'oauth_failed'], true)
                ? $e->getMessage() : 'oauth_failed';
            if ($key === 'oauth_failed') {
                report($e);
            }

            return redirect($back)->with('error', 'flash.'.$key);
        } catch (Throwable $e) {
            report($e);

            return redirect($back)->with('error', 'flash.oauth_failed');
        }

        if ($linkUser) {
            return redirect()->route('profile.edit')->with('success', 'flash.oauth_linked');
        }

        $user = $result['user'];
        Auth::login($user, true);
        $request->session()->regenerate();
        $request->session()->put('locale', $user->locale);
        $user->forceFill(['last_login_at' => now()])->save();
        $this->security->recordLogin($request, $user->email.' ('.$provider.')', $user, true);

        if ($user->needsOnboarding()) {
            return redirect()->route('onboarding.show')->with('success', $result['created'] ? 'flash.oauth_welcome' : 'flash.oauth_finish_profile');
        }

        return redirect()->intended(route($user->dashboardRoute()))->with('success', 'flash.oauth_signed_in');
    }

    public function unlink(Request $request, string $provider): RedirectResponse
    {
        $this->guardProvider($provider);

        try {
            $this->social->unlink($request->user(), $provider);
        } catch (RuntimeException) {
            return back()->with('error', 'flash.oauth_last_method');
        }

        return back()->with('success', 'flash.oauth_unlinked');
    }

    private function guardProvider(string $provider): void
    {
        abort_unless(in_array($provider, SocialAccount::PROVIDERS, true), 404);
    }

    private function driver(string $provider)
    {
        $driver = Socialite::driver($provider)->scopes(self::SCOPES[$provider]);

        return $provider === 'facebook' ? $driver->fields(['name', 'email', 'picture.width(512)']) : $driver->with(['prompt' => 'select_account']);
    }
}
