<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

class PlatformNotification extends Notification implements ShouldQueue
{
    use Queueable;

    private const MAIL_COPY = [
        'order_placed' => ['New pre-order :code for :date', 'You have a new pre-order, **:code**, for pickup on **:date** at :market.', 'Accept or decline it from your dashboard so the customer knows where they stand. Stock for it is already held.', 'Review the order'],
        'order_confirmation' => ['Your pre-order :code is placed', 'Thanks! Your pre-order **:code** with :farmer is placed for pickup on **:date** at :market.', 'Nothing has been charged — you pay the farmer at the stall. You can change or cancel it free until the cut-off shown on the order. Bring the code **:code** to pickup.', 'View your order'],
        'order_accepted' => [':farmer accepted order :code', 'Good news — :farmer accepted your order **:code**.', 'It will be packed for you on **:date** at :market. We will e-mail you again when it is ready.', 'View your order'],
        'order_ready' => ['Order :code is ready for pickup', 'Your order **:code** is packed and waiting at :farmer’s stall at **:market**.', 'Show the code **:code** at the stall, check your produce, and pay the farmer directly. Running late? Message the farmer from your order page.', 'Get directions'],
        'order_completed' => ['Thanks for shopping local — order :code', 'Order **:code** is complete. Thank you for buying straight from :farmer.', 'How was it? A short review helps other shoppers and means a lot to a small grower.', 'Leave a review'],
        'order_declined' => ['Order :code could not be fulfilled', 'Sorry — :farmer could not fulfil order **:code** for :date.', 'You owe nothing and any coupon you used has been returned. Tap the heart on a product to get an alert when it is back.', 'Find something else'],
        'order_cancelled' => ['Order :code was cancelled', 'The customer cancelled order **:code** (pickup :date).', 'The stock has been released back to your listings automatically — no action needed.', 'Open the order'],
        'order_modified' => ['Order :code was updated', 'The customer changed order **:code** for :date.', 'Please check the new quantities before you pack.', 'Open the order'],
        'pickup_reminder' => ['Tomorrow: pickup :code at :market', 'Reminder — your pre-order **:code** from :farmer is ready for pickup **tomorrow, :date, :time** at **:market**.', 'Show the QR code or the code **:code** at the stall and pay the farmer directly. Can’t make it? Message the farmer from your order page so the produce doesn’t go to waste.', 'Open your order & QR'],
        'order_no_show' => ['Order :code was not collected', 'Order **:code** from :farmer wasn’t collected during its pickup window on :date, so the produce went back on sale.', 'If this was a mistake, reply to this e-mail. Repeated missed pickups pause pre-ordering on an account.', 'View the order'],
        'restock' => [':product is back in stock', 'Good news — **:product** from :farmer is back in stock.', 'Popular items go quickly on market week, so reserve yours early.', 'Reserve now'],
        'farmer_approved' => ['Your stall is approved — welcome to GleanGrid', 'Welcome aboard! Your stall has been approved and is now live.', 'Next steps: add your products, set your pickup windows and cut-off, and pin your stall on the map. Customers can pre-order as soon as you do.', 'Set up your stall'],
        'farmer_suspended' => ['Your GleanGrid stall has been suspended', 'Your stall has been suspended and is hidden from customers for now.', 'Open orders are unaffected. If you think this is a mistake, reply to this e-mail or contact support and we will review it.', 'Open your dashboard'],
        'new_review' => ['New :rating★ review on :subject', ':customer left a **:rating★** review on :subject.', 'You can reply publicly from your Reviews page — a thoughtful reply builds trust with future customers.', 'Read and reply'],
        'review_reply' => [':farmer replied to your review', ':farmer replied to your review.', null, 'Read the reply'],
        'family_invite' => [':owner invited you to their household', ':owner invited you to share their GleanGrid household.', 'Linked members can see household pre-orders and collect them at the stall. Accept only if you know this person.', 'Respond to the invite'],
        'family_accepted' => [':member joined your household', ':member accepted your family sharing invite.', null, 'Manage family'],
    ];

    public function __construct(
        public string $key,
        public array $params = [],
        public ?string $url = null,
        public bool $mail = false,
    ) {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return $this->mail ? ['database', 'mail'] : ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        [$subject, $headline, $detail, $button] = self::MAIL_COPY[$this->key] ?? ['GleanGrid update', 'You have a new update on GleanGrid.', null, 'Open GleanGrid'];

        $message = (new MailMessage)
            ->subject($this->fill($subject))
            ->greeting('Salaam '.strtok((string) $notifiable->name, ' ').',')
            ->line($this->fill($headline));

        if ($detail) {
            $message->line($this->fill($detail));
        }
        if ($this->url) {
            $message->action($button, $this->url);
        }

        return $message->salutation("Fresh regards,\nThe GleanGrid team · Hyderabad");
    }

    public function toArray(object $notifiable): array
    {
        return ['key' => $this->key, 'params' => $this->params, 'url' => $this->url];
    }

    private function fill(string $text): string
    {
        foreach ($this->params as $name => $value) {
            if ($name === 'date' && is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                $value = Carbon::parse($value)->format('l, j F');
            }
            $text = str_replace(':'.$name, (string) $value, $text);
        }

        return $text;
    }
}
