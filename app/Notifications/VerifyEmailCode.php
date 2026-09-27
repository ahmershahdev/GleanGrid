<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailCode extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private string $code, private int $minutes)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("{$this->code} is your GleanGrid code")
            ->greeting('Salaam '.strtok($notifiable->name, ' ').',')
            ->line('Here is the code to confirm your e-mail address:')
            ->line("## {$this->code}")
            ->line("It works once and expires in {$this->minutes} minutes. If you didn’t create a GleanGrid account, you can ignore this e-mail — nobody can sign in without the password.")
            ->action('Open GleanGrid', route('verification.notice'));
    }
}
