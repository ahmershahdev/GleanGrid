<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use App\Notifications\ContactReply;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class InboxTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private const SECRET = 'whsec_dGVzdC1zZWNyZXQtZm9yLWdsZWFuZ3JpZA==';

    private function signed(array $payload, ?int $timestamp = null): array
    {
        $body = json_encode($payload);
        $id = 'msg_'.uniqid();
        $ts = (string) ($timestamp ?? time());
        $sig = base64_encode(hash_hmac('sha256', "{$id}.{$ts}.{$body}", base64_decode(substr(self::SECRET, 6)), true));

        return [$body, ['svix-id' => $id, 'svix-timestamp' => $ts, 'svix-signature' => "v1,{$sig}", 'Content-Type' => 'application/json']];
    }

    public function test_signed_inbound_email_lands_in_the_inbox_once(): void
    {
        config(['services.resend.webhook_secret' => self::SECRET, 'services.resend.key' => 're_test']);
        Http::fake(['api.resend.com/*' => Http::response(['text' => 'Do you have mangoes on Sunday?'])]);
        $payload = ['type' => 'email.received', 'data' => ['email_id' => 'em_123', 'from' => 'Ayesha Khan <ayesha@example.com>', 'subject' => 'Mangoes?']];

        [$body, $headers] = $this->signed($payload);
        $this->call('POST', route('webhooks.resend'), [], [], [], $this->transformHeadersToServerVars($headers), $body)->assertOk();
        [$body, $headers] = $this->signed($payload); // Resend retry
        $this->call('POST', route('webhooks.resend'), [], [], [], $this->transformHeadersToServerVars($headers), $body)->assertOk();

        $this->assertSame(1, ContactMessage::where('external_id', 'em_123')->count());
        $this->assertDatabaseHas('contact_messages', ['email' => 'ayesha@example.com', 'name' => 'Ayesha Khan', 'source' => 'email', 'message' => 'Do you have mangoes on Sunday?']);
    }

    public function test_bad_or_stale_signatures_are_rejected(): void
    {
        config(['services.resend.webhook_secret' => self::SECRET]);
        $payload = ['type' => 'email.received', 'data' => ['email_id' => 'em_x']];

        [$body, $headers] = $this->signed($payload, time() - 3600);
        $this->call('POST', route('webhooks.resend'), [], [], [], $this->transformHeadersToServerVars($headers), $body)->assertUnauthorized();

        [$body, $headers] = $this->signed($payload);
        $headers['svix-signature'] = 'v1,forged';
        $this->call('POST', route('webhooks.resend'), [], [], [], $this->transformHeadersToServerVars($headers), $body)->assertUnauthorized();

        $this->assertDatabaseMissing('contact_messages', ['external_id' => 'em_x']);
    }

    public function test_admin_can_reply_by_email(): void
    {
        Notification::fake();
        $admin = User::where('role', 'admin')->first();
        $message = ContactMessage::first();

        $this->actingAs($admin)->post(route('admin.messages.reply', $message), ['reply' => 'Thanks for writing — yes, Sunday from 8am.'])->assertSessionHasNoErrors();

        Notification::assertSentOnDemand(ContactReply::class);
        $this->assertNotNull($message->fresh()->replied_at);
    }
}
