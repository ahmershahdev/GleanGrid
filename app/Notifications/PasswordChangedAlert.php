<?php

namespace App\Notifications;

use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordChangedAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private ?string $ip, private CarbonInterface $at)
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
            ->subject('Your GleanGrid password was changed')
            ->greeting('Salaam '.strtok($notifiable->name, ' ').',')
            ->line('The password on your account was changed on '.$this->at->timezone(config('app.timezone'))->format('D j M Y, g:i a').' (PKT) from IP '.($this->ip ?? 'unknown').'.')
            ->line('For your safety we signed out every other device.')
            ->line('Didn’t do this? Reset your password straight away and write to support@ahmershah.dev.')
            ->action('Reset password', route('password.request'));
    }
}
