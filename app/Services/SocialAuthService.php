<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\SocialAccount;
use App\Models\User;
use App\Notifications\PlatformNotification;
use App\Support\ImageUpload;
use App\Support\Settings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as ProviderUser;
use RuntimeException;

class SocialAuthService
{
    public function configured(string $provider): bool
    {
        return in_array($provider, SocialAccount::PROVIDERS, true)
            && filled(config("services.{$provider}.client_id"))
            && filled(config("services.{$provider}.client_secret"));
    }

    public function status(): array
    {
        return collect(SocialAccount::PROVIDERS)->mapWithKeys(fn ($p) => [$p => $this->configured($p)])->all();
    }

    /**
     * @return array{user: User, created: bool, linked: bool}
     */
    public function resolve(string $provider, ProviderUser $social, string $role = User::ROLE_CUSTOMER, ?User $linkTo = null): array
    {
        $providerId = trim((string) $social->getId());
        if ($providerId === '') {
            throw new RuntimeException('oauth_failed');
        }
        $email = Str::lower(trim((string) $social->getEmail()));
        $emailOk = $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) && $this->emailVerified($provider, $social);

        $result = DB::transaction(function () use ($provider, $providerId, $email, $emailOk, $social, $role, $linkTo) {
            $account = SocialAccount::where('provider', $provider)->where('provider_user_id', $providerId)->lockForUpdate()->first();

            if ($linkTo) {
                if ($account && $account->user_id !== $linkTo->id) {
                    throw new RuntimeException('oauth_taken');
                }
                if (! $account && $linkTo->socialAccounts()->where('provider', $provider)->exists()) {
                    throw new RuntimeException('oauth_already_linked');
                }
                $this->link($linkTo, $provider, $providerId, $email ?: null);

                return ['user' => $linkTo, 'created' => false, 'linked' => ! $account];
            }

            if ($account) {
                $user = $account->user;
                $this->ensureUsable($user);
                $account->update(['last_used_at' => now(), 'email' => $email ?: $account->email]);

                return ['user' => $user, 'created' => false, 'linked' => false];
            }

            if ($email === '') {
                throw new RuntimeException('oauth_no_email');
            }
            if (! $emailOk) {
                throw new RuntimeException('oauth_unverified');
            }

            $user = User::where('email', $email)->lockForUpdate()->first();
            if ($user) {
                $this->ensureUsable($user);
                if (! $user->email_verified_at && ! $user->isDemo()) {
                    $user->forceFill(['password' => null, 'remember_token' => Str::random(60), 'email_verified_at' => now()])->save();
                    DB::table('sessions')->where('user_id', $user->id)->delete();
                }
                $this->link($user, $provider, $providerId, $email);

                return ['user' => $user, 'created' => false, 'linked' => true];
            }

            $role = $role === User::ROLE_FARMER ? User::ROLE_FARMER : User::ROLE_CUSTOMER;
            if (! Settings::get($role === User::ROLE_FARMER ? 'farmer_registration_open' : 'customer_registration_open')) {
                throw new RuntimeException('registration_closed');
            }

            $user = new User([
                'name' => Str::limit(trim((string) $social->getName()) ?: Str::before($email, '@'), 100, ''),
                'username' => $this->username($email, (string) $social->getNickname()),
                'email' => $email,
                'role' => $role,
                'status' => 'active',
                'locale' => session('locale', app()->getLocale()),
            ]);
            $user->forceFill(['email_verified_at' => now(), 'password' => null])->save();
            $this->link($user, $provider, $providerId, $email);

            return ['user' => $user, 'created' => true, 'linked' => true];
        }, attempts: 3);

        $user = $result['user'];
        if (! $user->avatar && ($url = $this->avatarUrl($provider, $social))) {
            if ($path = ImageUpload::storeRemote($url, 'avatars', maxSide: 512)) {
                $user->forceFill(['avatar' => $path])->save();
            }
        }

        if ($result['linked']) {
            AuditLog::record('account.social_linked', ucfirst($provider)." sign-in connected to {$user->email}", $user);
            if (! $result['created']) {
                $user->notify(new PlatformNotification('social_linked', ['provider' => ucfirst($provider)], route('profile.edit'), true));
            }
        }

        return $result;
    }

    public function unlink(User $user, string $provider): void
    {
        DB::transaction(function () use ($user, $provider) {
            $accounts = $user->socialAccounts()->lockForUpdate()->get();
            if (! $user->hasPassword() && $accounts->count() <= 1) {
                throw new RuntimeException('oauth_last_method');
            }
            $user->socialAccounts()->where('provider', $provider)->delete();
        });

        AuditLog::record('account.social_unlinked', ucfirst($provider)." sign-in disconnected from {$user->email}", $user);
    }

    private function link(User $user, string $provider, string $providerId, ?string $email): void
    {
        SocialAccount::updateOrCreate(
            ['provider' => $provider, 'provider_user_id' => $providerId],
            ['user_id' => $user->id, 'email' => $email, 'last_used_at' => now()],
        );
    }

    private function ensureUsable(?User $user): void
    {
        if (! $user || $user->anonymized_at || ! $user->isActive()) {
            throw new RuntimeException('account_inactive');
        }
    }

    private function emailVerified(string $provider, ProviderUser $social): bool
    {
        $raw = method_exists($social, 'getRaw') ? (array) $social->getRaw() : (array) ($social->user ?? []);

        return match ($provider) {
            'google' => filter_var($raw['email_verified'] ?? $raw['verified_email'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'facebook' => true,
            default => false,
        };
    }

    private function avatarUrl(string $provider, ProviderUser $social): ?string
    {
        $url = $provider === 'facebook' ? ($social->avatar_original ?? $social->getAvatar()) : $social->getAvatar();
        if ($provider === 'google' && $url) {
            $url = preg_replace('/=s\d+-c$/', '=s512-c', $url);
        }

        return $url ?: null;
    }

    private function username(string $email, string $nickname): string
    {
        $base = Str::of($nickname ?: Str::before($email, '@'))->ascii()->lower()->replaceMatches('/[^a-z0-9_-]+/', '')->limit(40, '')->toString();
        $base = strlen($base) >= 3 ? $base : 'member'.$base;
        $candidate = $base;
        while (User::where('username', $candidate)->exists()) {
            $candidate = $base.'-'.Str::lower(Str::random(4));
        }

        return $candidate;
    }
}
