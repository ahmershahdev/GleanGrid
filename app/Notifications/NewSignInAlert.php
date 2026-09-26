<?php

namespace App\Notifications;

use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewSignInAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private string $device, private ?string $ip, private CarbonInterface $at)
    {
        // Only send once the surrounding transaction commits, never for rolled-back work.
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New sign-in to your GleanGrid account')
            ->greeting('Hi '.strtok($notifiable->name, ' ').',')
            ->line("Your account was just used to sign in from **{$this->device}**.")
            ->line('Time: '.$this->at->timezone(config('app.timezone'))->format('D j M Y, g:i a').' (PKT) · IP: '.($this->ip ?? 'unknown'))
            ->line('If this was you, there’s nothing to do. If not, change your password now — that also signs out every other device.')
            ->action('Review account security', route('profile.edit').'#security');
    }

    public function toArray(object $notifiable): array
    {
        return ['key' => 'new_signin', 'params' => ['device' => $this->device], 'url' => route('profile.edit').'#security'];
    }
}
