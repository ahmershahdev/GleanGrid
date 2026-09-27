<?php

namespace Tests\Feature;

use App\Support\BotGuard;
use Illuminate\Encryption\Encrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BotAndCsrfTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function message(array $extra = []): array
    {
        return ['name' => 'Sana', 'email' => 'sana@example.com', 'topic' => 'order', 'message' => 'Where is my mango order today?', ...$extra];
    }

    public function test_form_tickets_are_fresh_on_every_render_and_cannot_be_read(): void
    {
        $a = $this->get(route('contact'))->viewData('page')['props']['formTicket'];
        $b = $this->get(route('contact'))->viewData('page')['props']['formTicket'];

        $this->assertNotSame($a, $b, 'every page render issues a new ticket');
        $this->assertStringNotContainsString((string) now()->year, base64_decode($a), 'the issue time is encrypted, not readable');
        $this->assertNotNull(BotGuard::readTicket($a));
    }

    public function test_missing_forged_or_tampered_tickets_are_rejected(): void
    {
        $ip = 0;
        foreach ([
            'missing' => $this->message(['website' => '']),
            'the old client clock' => $this->message(['website' => '', 'form_started_at' => now()->subMinute()->getTimestampMs()]),
            'random' => $this->message(['website' => '', 'form_ticket' => base64_encode(random_bytes(48))]),
            'encrypted with another key' => $this->message(['website' => '', 'form_ticket' => (new Encrypter(random_bytes(32), 'AES-256-CBC'))->encryptString('{"t":1}')]),
            'from the future' => $this->message(['website' => '', 'form_ticket' => Crypt::encryptString(json_encode(['t' => now()->addHour()->getTimestampMs()]))]),
        ] as $payload) {
            // each case from its own address: the contact form allows 3 sends a minute per IP
            $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.'.(++$ip)])
                ->post(route('contact.send'), $payload)->assertSessionHasErrors(['captcha' => 'captcha.failed']);
        }

        $this->assertDatabaseMissing('contact_messages', ['email' => 'sana@example.com']);
    }

    public function test_too_fast_and_expired_tickets_are_rejected_and_a_normal_one_passes(): void
    {
        $this->post(route('contact.send'), $this->message(['website' => '', 'form_ticket' => $this->formTicket(0)]))
            ->assertSessionHasErrors(['captcha' => 'captcha.failed']);

        $this->post(route('contact.send'), $this->message(['website' => '', 'form_ticket' => $this->formTicket(3 * 3600)]))
            ->assertSessionHasErrors(['captcha' => 'captcha.expired']);

        $this->post(route('contact.send'), $this->human($this->message()))->assertSessionHasNoErrors();
        $this->assertDatabaseHas('contact_messages', ['email' => 'sana@example.com']);
    }

    public function test_the_csrf_token_changes_on_every_full_page_load_but_not_on_background_calls(): void
    {
        $this->get(route('home'))->assertOk();
        $first = session()->token();

        $this->get(route('home'))->assertOk();
        $second = session()->token();
        $this->assertNotSame($first, $second, 'a refresh issues a new token');
        $this->assertSame(40, strlen($second));

        $this->getJson(route('home'))->assertOk();
        $this->assertSame($second, session()->token(), 'JSON / Inertia requests keep the current token');
    }

    public function test_cross_site_writes_are_refused_before_they_reach_a_controller(): void
    {
        $this->withHeaders(['Sec-Fetch-Site' => 'cross-site'])
            ->post(route('contact.send'), $this->human($this->message()))
            ->assertForbidden();
        $this->assertDatabaseMissing('contact_messages', ['email' => 'sana@example.com']);

        $this->withHeaders(['Sec-Fetch-Site' => 'same-origin'])
            ->post(route('contact.send'), $this->human($this->message()))
            ->assertSessionHasNoErrors();
    }

    public function test_turnstile_is_the_challenge_when_configured(): void
    {
        config([
            'services.recaptcha.v2_site' => 'v2-site', 'services.recaptcha.v2_secret' => 'v2-secret',
            'services.turnstile.site' => 'ts-site', 'services.turnstile.secret' => 'ts-secret',
        ]);

        $captcha = $this->get(route('contact'))->viewData('page')['props']['captcha'];
        $this->assertSame(['v3' => null, 'v2' => null, 'turnstile' => 'ts-site'], $captcha);

        Http::fake(['challenges.cloudflare.com/*' => Http::sequence()
            ->push(['success' => true, 'action' => 'login', 'hostname' => 'localhost'])
            ->push(['success' => false, 'error-codes' => ['invalid-input-response']])
            ->push(['success' => true, 'action' => 'contact', 'hostname' => 'localhost']),
        ]);

        $this->post(route('contact.send'), $this->human($this->message()))->assertSessionHasErrors(['captcha' => 'captcha.required']);
        // a token minted for the sign-in form is not accepted on the contact form
        $this->post(route('contact.send'), $this->human($this->message(['captcha_turnstile' => 'from-login'])))->assertSessionHasErrors(['captcha' => 'captcha.failed']);
        $this->post(route('contact.send'), $this->human($this->message(['captcha_turnstile' => 'bad'])))->assertSessionHasErrors(['captcha' => 'captcha.failed']);
        $this->post(route('contact.send'), $this->human($this->message(['captcha_turnstile' => 'good'])))->assertSessionHasNoErrors();

        Http::assertSent(fn ($r) => $r->url() === 'https://challenges.cloudflare.com/turnstile/v0/siteverify' && $r['secret'] === 'ts-secret' && filled($r['idempotency_key']));
    }

    public function test_recaptcha_can_still_be_chosen_over_turnstile(): void
    {
        config([
            'services.recaptcha.v2_site' => 'v2-site', 'services.recaptcha.v2_secret' => 'v2-secret',
            'services.turnstile.site' => 'ts-site', 'services.turnstile.secret' => 'ts-secret',
            'services.captcha.challenge' => 'recaptcha',
        ]);

        $this->assertSame(['v3' => null, 'v2' => 'v2-site', 'turnstile' => null], BotGuard::clientConfig());
    }

    public function test_an_unreachable_provider_fails_closed_when_asked_to(): void
    {
        config(['services.turnstile.site' => 'ts-site', 'services.turnstile.secret' => 'ts-secret', 'services.captcha.fail_open' => false]);
        Http::fake(fn () => throw new ConnectionException('down'));

        $this->post(route('contact.send'), $this->human($this->message(['captcha_turnstile' => 'token'])))
            ->assertSessionHasErrors(['captcha' => 'captcha.failed']);
    }
}
