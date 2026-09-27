<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ResendWebhookController extends Controller
{
    private const TOLERANCE = 300;

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($this->signatureIsValid($request), 401, 'Invalid signature');

        $event = $request->json()->all();
        if (($event['type'] ?? null) !== 'email.received') {
            return response()->json(['ignored' => true]);
        }

        $data = $event['data'] ?? [];
        $id = (string) ($data['email_id'] ?? '');
        if ($id === '' || ContactMessage::where('external_id', $id)->exists()) {
            return response()->json(['ok' => true]);
        }

        $body = $this->fetchBody($id);
        [$name, $email] = $this->parseAddress((string) ($data['from'] ?? $body['from'] ?? ''));

        ContactMessage::create([
            'name' => Str::limit($name ?: $email, 100, ''),
            'email' => Str::limit($email, 100, ''),
            'subject' => Str::limit((string) ($data['subject'] ?? '(no subject)'), 150, ''),
            'message' => Str::limit($body['text'] ?? trim(strip_tags((string) ($body['html'] ?? ''))) ?: '(empty message)', 10000, '…'),
            'source' => 'email',
            'external_id' => $id,
        ]);

        return response()->json(['ok' => true]);
    }

    private function signatureIsValid(Request $request): bool
    {
        $secret = (string) config('services.resend.webhook_secret');
        [$id, $timestamp, $header] = [$request->header('svix-id'), $request->header('svix-timestamp'), $request->header('svix-signature')];
        if ($secret === '' || ! $id || ! $timestamp || ! $header || abs(time() - (int) $timestamp) > self::TOLERANCE) {
            return false;
        }

        $key = base64_decode(Str::after($secret, 'whsec_'));
        $expected = base64_encode(hash_hmac('sha256', "{$id}.{$timestamp}.{$request->getContent()}", $key, true));

        foreach (explode(' ', $header) as $candidate) {
            if (hash_equals($expected, Str::after($candidate, ','))) {
                return true;
            }
        }

        return false;
    }

    private function fetchBody(string $id): array
    {
        try {
            return Http::withToken((string) config('services.resend.key'))->timeout(8)
                ->get("https://api.resend.com/emails/receiving/{$id}")->throw()->json() ?? [];
        } catch (\Throwable $e) {
            Log::warning('Resend: could not fetch received e-mail body', ['id' => $id, 'error' => $e->getMessage()]);

            return [];
        }
    }

    private function parseAddress(string $from): array
    {
        if (preg_match('/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/', $from, $m)) {
            return [trim($m[1]), strtolower(trim($m[2]))];
        }

        return ['', strtolower(trim($from))];
    }
}
