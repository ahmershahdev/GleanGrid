<?php

namespace Tests\Feature;

use App\Models\LoginEvent;
use App\Models\User;
use App\Models\VerificationCode;
use App\Notifications\NewSignInAlert;
use App\Notifications\PasswordChangedAlert;
use App\Notifications\VerifyEmailCode;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function registration(array $overrides = []): array
    {
        return [
            'role' => 'customer', 'name' => 'Test Shopper', 'username' => 'testshopper', 'email' => 'shopper@example.com',
            'phone' => '+92 300 1234567', 'address' => 'Qasimabad, Hyderabad', 'city' => 'Hyderabad',
            'password' => 'Fresh#Mango7', 'password_confirmation' => 'Fresh#Mango7', 'terms' => true,
            'website' => '', 'form_ticket' => $this->formTicket(),
            ...$overrides,
        ];
    }

    public function test_sign_up_sends_a_code_and_blocks_ordering_until_verified(): void
    {
        Notification::fake();

        $this->post(route('register'), $this->registration())->assertRedirect(route('verification.notice'));

        $user = User::where('email', 'shopper@example.com')->first();
        $this->assertNull($user->email_verified_at);
        $this->assertStringStartsWith('$argon2id$', $user->password, 'passwords must be hashed with Argon2id');

        $code = null;
        Notification::assertSentTo($user, VerifyEmailCode::class, function ($n) use (&$code) {
            $code = (fn () => $this->code)->call($n);

            return true;
        });

        $this->actingAs($user)->get(route('customer.checkout'))->assertRedirect(route('verification.notice'));

        $this->actingAs($user)->post(route('verification.verify'), ['code' => $code])->assertSessionHasNoErrors();
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->actingAs($user)->get(route('customer.checkout'))->assertOk();
    }

    public function test_codes_expire_after_too_many_wrong_guesses(): void
    {
        Notification::fake();
        $this->post(route('register'), $this->registration());
        $user = User::where('email', 'shopper@example.com')->first();

        foreach (range(1, VerificationCode::MAX_ATTEMPTS) as $i) {
            $this->actingAs($user)->post(route('verification.verify'), ['code' => '000000']);
        }

        $this->assertSame(VerificationCode::MAX_ATTEMPTS, VerificationCode::where('user_id', $user->id)->value('attempts'));
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertTrue(VerificationCode::where('user_id', $user->id)->value('expires_at') > now()->addMinutes(10));
    }

    public function test_honeypot_and_time_trap_reject_bots(): void
    {
        $this->post(route('register'), $this->registration(['website' => 'http://spam.example']))->assertSessionHasErrors('captcha');
        $this->post(route('register'), $this->registration(['username' => 'fastbot', 'email' => 'fast@example.com', 'form_ticket' => $this->formTicket(0)]))
            ->assertSessionHasErrors('captcha');

        $this->assertDatabaseMissing('users', ['email' => 'shopper@example.com']);
        $this->assertDatabaseMissing('users', ['email' => 'fast@example.com']);
    }

    public function test_weak_passwords_are_rejected(): void
    {
        $this->post(route('register'), $this->registration(['password' => 'password1', 'password_confirmation' => 'password1']))
            ->assertSessionHasErrors('password');
    }

    public function test_repeated_failed_sign_ins_lock_the_account_for_that_ip(): void
    {
        foreach (range(1, 5) as $i) {
            $this->post(route('login'), $this->human(['login' => 'customer@gleangrid.test', 'password' => 'wrong-'.$i]));
        }

        $this->post(route('login'), $this->human(['login' => 'customer@gleangrid.test', 'password' => 'Customer@123']))->assertSessionHasErrors('login');
        $this->assertGuest();
        $this->assertSame(5, LoginEvent::where('login', 'customer@gleangrid.test')->where('successful', false)->count());
    }

    public function test_sign_in_from_a_new_device_sends_an_alert(): void
    {
        Notification::fake();
        $user = User::where('email', 'customer@gleangrid.test')->first();

        $this->withHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0')
            ->post(route('login'), $this->human(['login' => $user->email, 'password' => 'Customer@123']));
        Notification::assertNothingSent();

        $this->post(route('logout'));
        $this->withHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 14) Firefox/131.0')
            ->post(route('login'), $this->human(['login' => $user->email, 'password' => 'Customer@123']));
        Notification::assertSentTo($user, NewSignInAlert::class);
    }

    public function test_bcrypt_hashes_are_upgraded_to_argon2id_on_sign_in(): void
    {
        $user = User::where('email', 'customer@gleangrid.test')->first();
        DB::table('users')->where('id', $user->id)->update(['password' => Hash::driver('bcrypt')->make('Customer@123')]);
        $this->assertStringStartsWith('$2y$', $user->fresh()->password);

        $this->post(route('login'), $this->human(['login' => $user->email, 'password' => 'Customer@123']))->assertRedirect();
        $this->assertStringStartsWith('$argon2id$', $user->fresh()->password);
    }

    public function test_changing_password_notifies_the_owner(): void
    {
        Notification::fake();
        $user = User::where('email', 'customer@gleangrid.test')->first();

        $this->actingAs($user)->put(route('profile.password'), [
            'current_password' => 'Customer@123', 'password' => 'New#Harvest9', 'password_confirmation' => 'New#Harvest9',
        ])->assertSessionHasNoErrors();

        Notification::assertSentTo($user, PasswordChangedAlert::class);
        $this->assertNotNull($user->fresh()->password_changed_at);
    }

    public function test_pages_send_a_nonce_csp_and_hardening_headers(): void
    {
        $response = $this->get(route('home'))->assertOk();

        $csp = $response->headers->get('Content-Security-Policy');
        $this->assertMatchesRegularExpression("/script-src 'self' 'nonce-[A-Za-z0-9]+' 'strict-dynamic'/", $csp);
        $this->assertStringContainsString("object-src 'none'", $csp);
        $this->assertStringContainsString("frame-ancestors 'self'", $csp);
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');

        preg_match("/'nonce-([^']+)'/", $csp, $m);
        $this->assertStringContainsString('nonce="'.$m[1].'"', $response->getContent(), 'inline scripts must carry the nonce');
    }

    public function test_policy_pages_faq_and_sitemap_render(): void
    {
        foreach (['faq', 'terms', 'privacy', 'returns', 'pickup-policy'] as $name) {
            $this->get(route($name))->assertOk();
        }

        $this->get(route('sitemap'))->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee('<urlset', false)
            ->assertSee(route('faq'), false);
    }

    public function test_a_duplicate_value_race_becomes_a_friendly_form_error(): void
    {
        Route::middleware('web')->post('/__duplicate', function () {
            throw new UniqueConstraintViolationException('mysql', 'insert into users', [], new \Exception("Duplicate entry 'a@b.c' for key 'users_email_unique'"));
        });

        $this->from('/register')->post('/__duplicate')->assertRedirect('/register')->assertSessionHasErrors('email');
    }

    public function test_writes_are_rate_limited_but_page_views_are_not(): void
    {
        $user = User::where('email', 'customer@gleangrid.test')->firstOrFail();
        for ($i = 0; $i < 70; $i++) {
            $this->actingAs($user)->get(route('customer.orders.index'))->assertOk();
        }
        for ($i = 0; $i < 60; $i++) {
            $this->actingAs($user)->post(route('notifications.read-all'));
        }
        $this->actingAs($user)->post(route('notifications.read-all'))->assertStatus(429);
    }
}
