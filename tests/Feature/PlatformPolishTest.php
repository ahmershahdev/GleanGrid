<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use App\Notifications\NewSignInAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlatformPolishTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function bot(array $extra = []): array
    {
        return $this->human($extra);
    }

    private function enableCaptcha(): void
    {
        config([
            'services.recaptcha.v3_site' => 'v3-site', 'services.recaptcha.v3_secret' => 'v3-secret',
            'services.recaptcha.v2_site' => 'v2-site', 'services.recaptcha.v2_secret' => 'v2-secret',
        ]);
    }

    public function test_checkbox_forms_require_the_v2_box_when_keys_are_set(): void
    {
        $this->enableCaptcha();
        Http::fake(['www.google.com/recaptcha/*' => Http::response(['success' => true, 'score' => 0.9, 'action' => 'contact'])]);

        $message = ['name' => 'Sana', 'email' => 'sana@example.com', 'topic' => 'order', 'message' => 'Where is my mango order today?'];

        $this->post(route('contact.send'), $this->bot($message + ['captcha_token' => 'v3']))
            ->assertSessionHasErrors(['captcha' => 'captcha.required']);

        $this->post(route('contact.send'), $this->bot($message + ['captcha_v2' => 'ticked']))->assertSessionHasNoErrors();
        $this->assertDatabaseHas('contact_messages', ['email' => 'sana@example.com']);
    }

    public function test_login_low_v3_score_escalates_to_the_checkbox(): void
    {
        $this->enableCaptcha();
        Http::fake(['www.google.com/recaptcha/*' => Http::response(['success' => true, 'score' => 0.1, 'action' => 'login'])]);

        $this->post(route('login'), $this->bot(['login' => 'someone@example.com', 'password' => 'x', 'captcha_token' => 'v3']))
            ->assertSessionHasErrors(['captcha' => 'captcha.challenge']);
    }

    public function test_client_only_receives_public_site_keys(): void
    {
        $this->enableCaptcha();

        $captcha = $this->get(route('login'))->viewData('page')['props']['captcha'];
        $this->assertSame(['v3' => 'v3-site', 'v2' => 'v2-site', 'turnstile' => null], $captcha);
    }

    public function test_demo_accounts_sign_in_without_captcha_or_email_and_count_as_verified(): void
    {
        $this->enableCaptcha();
        Http::fake();
        Notification::fake();

        $this->post(route('login'), ['login' => 'farmer@gleangrid.test', 'password' => 'Farmer@123', 'website' => ''])
            ->assertRedirect(route('farmer.dashboard'));

        Http::assertNothingSent();
        $demo = User::where('email', 'farmer@gleangrid.test')->first();
        $this->assertTrue($demo->isDemo());
        $this->assertTrue($demo->forceFill(['email_verified_at' => null])->hasVerifiedEmail());
        $this->assertNull($demo->routeNotificationForMail());
    }

    public function test_demo_accounts_never_receive_email_but_keep_in_app_alerts(): void
    {
        $demo = User::where('email', 'customer@gleangrid.test')->first();
        Notification::fake();

        $demo->notify(new NewSignInAlert('Chrome on Windows', '127.0.0.1', now()));

        Notification::assertSentTo($demo, NewSignInAlert::class);
        $this->assertNull($demo->routeNotificationFor('mail'));
    }

    public function test_contact_topic_is_stored_separately_and_blank_subject_uses_the_topic(): void
    {
        $this->post(route('contact.send'), $this->bot(['name' => 'Omar', 'email' => 'omar@example.com', 'topic' => 'sell', 'subject' => '', 'message' => 'I grow okra in Hatri and want a stall.']))
            ->assertSessionHasNoErrors();

        $row = ContactMessage::where('email', 'omar@example.com')->first();
        $this->assertSame('sell', $row->topic);
        $this->assertSame('Selling on GleanGrid', $row->subject);

        $this->post(route('contact.send'), $this->bot(['name' => 'Omar', 'email' => 'omar2@example.com', 'topic' => 'other', 'subject' => '', 'message' => 'Something that fits no box at all.']))
            ->assertSessionHasErrors('subject');
    }

    public function test_live_search_groups_ranks_and_suggests(): void
    {
        $mango = $this->postJson(route('search.suggest'), ['q' => 'mango'])->assertOk()->json();
        $this->assertNotEmpty($mango['groups']['produce']);
        $this->assertStringContainsStringIgnoringCase('mango', $mango['groups']['produce'][0]['title']);

        $typo = $this->postJson(route('search.suggest'), ['q' => 'tomatos'])->assertOk()->json();
        $this->assertSame(0, $typo['total']);
        $this->assertSame('tomatoes', $typo['suggestion']);

        $this->assertSame(0, $this->postJson(route('search.suggest'), ['q' => '%%'])->json('total'));
        $this->postJson(route('search.suggest'), ['q' => 'x', 'scope' => 'nope'])->assertStatus(422);
    }

    public function test_avatar_upload_is_stored_as_webp_and_can_be_removed(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('GD with WebP is required for server-side re-encoding.');
        }
        Storage::fake('public');
        $user = User::where('email', 'customer@gleangrid.test')->first();
        $profile = ['name' => $user->name, 'username' => $user->username, 'email' => $user->email, 'phone' => $user->phone, 'address' => $user->address, 'locale' => 'en'];

        $this->actingAs($user)->put(route('profile.update'), [...$profile, 'avatar' => UploadedFile::fake()->image('me.png', 1200, 900)])->assertSessionHasNoErrors();
        $path = $user->fresh()->avatar;
        $this->assertStringEndsWith('.webp', $path);
        Storage::disk('public')->assertExists($path);
        $this->assertLessThanOrEqual(512, getimagesize(Storage::disk('public')->path($path))[0], 'avatars are scaled to 512px');

        $this->actingAs($user)->put(route('profile.update'), [...$profile, 'remove_avatar' => 1])->assertSessionHasNoErrors();
        $this->assertNull($user->fresh()->avatar);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_svg_uploads_are_rejected(): void
    {
        $user = User::where('email', 'customer@gleangrid.test')->first();
        $svg = UploadedFile::fake()->createWithContent('x.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

        $this->actingAs($user)->put(route('profile.update'), ['name' => $user->name, 'username' => $user->username, 'email' => $user->email, 'phone' => $user->phone, 'address' => $user->address, 'locale' => 'en', 'avatar' => $svg])
            ->assertSessionHasErrors('avatar');
    }

    public function test_csp_nonce_rotates_and_upgrade_directive_only_on_https(): void
    {
        $a = $this->get('http://localhost/')->headers->get('Content-Security-Policy');
        $b = $this->get('http://localhost/')->headers->get('Content-Security-Policy');

        preg_match("/'nonce-([^']+)'/", $a, $na);
        preg_match("/'nonce-([^']+)'/", $b, $nb);
        $this->assertNotSame($na[1], $nb[1], 'every response gets a fresh nonce');
        $this->assertStringNotContainsString('upgrade-insecure-requests', $a, 'plain-http hosts must not rewrite XHR to https');

        $secure = $this->get('https://localhost/')->headers->get('Content-Security-Policy');
        $this->assertStringContainsString('upgrade-insecure-requests', $secure);
    }

    public function test_public_write_endpoints_are_throttled(): void
    {
        foreach (range(1, 20) as $i) {
            $this->post(route('preferences.locale'), ['locale' => 'en']);
        }
        $this->post(route('preferences.locale'), ['locale' => 'en'])->assertStatus(429);
    }
}
