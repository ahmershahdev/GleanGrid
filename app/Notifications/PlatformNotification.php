<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * One notification type for the whole platform. The payload carries a
 * translation key plus params, so the React side can render the alert in the
 * reader's own language; e-mail falls back to the English copy below.
 *
 * Queued: with QUEUE_CONNECTION=database and a worker, SMTP never slows a request.
 */
class PlatformNotification extends Notification implements ShouldQueue
{
    use Queueable;

    private const MAIL_COPY = [
        'order_placed' => ['New pre-order :code', 'You have a new pre-order :code for pickup on :date.'],
        'order_confirmation' => ['Order :code received', 'Thanks! Your pre-order :code with :farmer is placed for pickup on :date. Pay at pickup.'],
        'order_accepted' => ['Order :code accepted', ':farmer accepted your order :code. See you on :date.'],
        'order_ready' => ['Order :code is ready for pickup', 'Your order :code is packed and ready at :market.'],
        'order_completed' => ['Order :code completed', 'Thanks for shopping local! You can now review :farmer.'],
        'order_declined' => ['Order :code declined', ':farmer could not fulfil order :code.'],
        'order_cancelled' => ['Order :code cancelled', 'The customer cancelled order :code.'],
        'order_modified' => ['Order :code updated', 'The customer changed order :code.'],
        'restock' => [':product is back', ':product from :farmer is back in stock.'],
        'farmer_approved' => ['Your stall is approved', 'Welcome to GleanGrid! You can now list products.'],
        'farmer_suspended' => ['Your stall was suspended', 'Your stall has been suspended. Contact support for details.'],
        'new_review' => ['New :rating★ review', ':customer left a review on :subject.'],
        'review_reply' => ['The farmer replied', ':farmer replied to your review.'],
        'family_invite' => ['Family sharing invite', ':owner invited you to share their GleanGrid household.'],
        'family_accepted' => ['Family link accepted', ':member joined your household.'],
    ];

    public function __construct(
        public string $key,
        public array $params = [],
        public ?string $url = null,
        public bool $mail = false,
    ) {
        // Only send once the surrounding transaction commits, never for rolled-back work.
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return $this->mail ? ['database', 'mail'] : ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        [$subject, $line] = self::MAIL_COPY[$this->key] ?? ['GleanGrid update', 'You have a new update.'];

        $message = (new MailMessage)
            ->subject($this->fill($subject))
            ->greeting('Hi '.$notifiable->name.',')
            ->line($this->fill($line));

        return $this->url ? $message->action('Open GleanGrid', $this->url) : $message;
    }

    public function toArray(object $notifiable): array
    {
        return ['key' => $this->key, 'params' => $this->params, 'url' => $this->url];
    }

    private function fill(string $text): string
    {
        foreach ($this->params as $name => $value) {
            $text = str_replace(':'.$name, (string) $value, $text);
        }

        return $text;
    }
}
