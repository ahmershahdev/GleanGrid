<?php

namespace App\Services;

use App\Models\LoginEvent;
use App\Models\User;
use App\Models\VerificationCode;
use App\Notifications\NewSignInAlert;
use App\Notifications\PasswordChangedAlert;
use App\Notifications\VerifyEmailCode;
use Illuminate\Http\Request;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class AccountSecurity
{
    private const CODE_TTL_MINUTES = 15;

    public function sendEmailCode(User $user): void
    {
        $code = (string) random_int(100000, 999999);

        DB::transaction(function () use ($user, $code) {
            VerificationCode::where('user_id', $user->id)->where('purpose', VerificationCode::EMAIL)
                ->whereNull('consumed_at')->update(['consumed_at' => now()]);

            VerificationCode::create([
                'user_id' => $user->id,
                'purpose' => VerificationCode::EMAIL,
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes(self::CODE_TTL_MINUTES),
            ]);
        });

        $this->notify($user, new VerifyEmailCode($code, self::CODE_TTL_MINUTES));
    }

    public function verifyEmailCode(User $user, string $code): void
    {
        $outcome = DB::transaction(function () use ($user, $code) {
            $record = VerificationCode::where('user_id', $user->id)->where('purpose', VerificationCode::EMAIL)
                ->whereNull('consumed_at')->latest('id')->lockForUpdate()->first();

            if (! $record || ! $record->isUsable()) {
                return 'verify.expired';
            }

            if (! Hash::check($code, $record->code_hash)) {
                $record->increment('attempts');

                return $record->attempts >= VerificationCode::MAX_ATTEMPTS ? 'verify.expired' : 'verify.wrong';
            }

            $record->update(['consumed_at' => now()]);
            $user->forceFill(['email_verified_at' => now()])->save();

            return null;
        });

        if ($outcome) {
            throw ValidationException::withMessages(['code' => $outcome]);
        }
    }

    public function recordLogin(Request $request, string $login, ?User $user, bool $successful): void
    {
        $hash = $this->deviceHash($request);

        $isNewDevice = $successful && $user
            && LoginEvent::where('user_id', $user->id)->where('successful', true)->exists()
            && ! LoginEvent::where('user_id', $user->id)->where('successful', true)->where('device_hash', $hash)->exists();

        LoginEvent::create([
            'user_id' => $user?->id,
            'login' => Str::limit($login, 100, ''),
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 255, ''),
            'device_hash' => $hash,
            'successful' => $successful,
        ]);

        if ($isNewDevice) {
            $this->notify($user, new NewSignInAlert($this->describeAgent($request->userAgent()), $request->ip(), now()));
        }
    }

    public function sessions(Request $request): Collection
    {
        return DB::table('sessions')->where('user_id', $request->user()->id)
            ->orderByDesc('last_activity')->get(['id', 'ip_address', 'user_agent', 'last_activity'])
            ->map(fn ($s) => [
                'id' => hash('sha256', $s->id),
                'device' => $this->describeAgent($s->user_agent),
                'ip' => $s->ip_address,
                'last_active' => date(DATE_ATOM, $s->last_activity),
                'current' => $s->id === $request->session()->getId(),
            ]);
    }

    public function logoutOtherSessions(Request $request): int
    {
        return DB::table('sessions')->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())->delete();
    }

    public function passwordChanged(Request $request, User $user): void
    {
        $user->forceFill(['password_changed_at' => now(), 'remember_token' => Str::random(60)])->save();

        if ($request->hasSession() && $request->user()?->is($user)) {
            $this->logoutOtherSessions($request);
        } else {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        $this->notify($user, new PasswordChangedAlert($request->ip(), now()));
    }

    private function notify(User $user, Notification $notification): void
    {
        try {
            $user->notify($notification);
        } catch (Throwable $e) {
            Log::error('Security notification failed', ['user' => $user->id, 'type' => class_basename($notification), 'error' => $e->getMessage()]);
        }
    }

    private function deviceHash(Request $request): string
    {
        return hash('sha256', $this->describeAgent($request->userAgent()));
    }

    public function describeAgent(?string $ua): string
    {
        $ua = (string) $ua;
        $browser = match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') || str_contains($ua, 'Opera') => 'Opera',
            str_contains($ua, 'Firefox/') => 'Firefox',
            str_contains($ua, 'Chrome/') => 'Chrome',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'Browser',
        };
        $os = match (true) {
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') => 'iOS',
            str_contains($ua, 'Mac OS') => 'macOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'an unknown device',
        };

        return "{$browser} on {$os}";
    }
}
